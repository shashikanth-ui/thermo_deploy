
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper to parse CSV line respecting quotes
function parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())
    return result
}

export async function POST(req: NextRequest) {
    if (!genAI) {
        return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Detect encoding
        let fileContent = ''
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            fileContent = buffer.subarray(2).toString('utf16le')
        } else if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            fileContent = buffer.subarray(3).toString('utf8')
        } else {
            // Heuristic for UTF-16LE without BOM
            let isUtf16 = true && buffer.length > 2
            const checkLen = Math.min(buffer.length, 50)
            for (let i = 1; i < checkLen; i += 2) {
                if (buffer[i] !== 0) {
                    isUtf16 = false
                    break
                }
            }
            fileContent = buffer.toString(isUtf16 ? 'utf16le' : 'utf8')
        }

        const lines = fileContent.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0)

        if (lines.length === 0) {
            return NextResponse.json({ error: "Empty file detected" }, { status: 400 })
        }

        // Detect delimiter
        const firstLine = lines[0]
        let delimiter = ','
        if (firstLine.includes('\t')) delimiter = '\t'
        else if (firstLine.includes(';')) delimiter = ';'

        console.log(`Debug CSV: Detected delimiter '${delimiter === '\t' ? '\\t' : delimiter}'`)

        // Headers
        const headers = parseCSVLine(lines[0].toLowerCase(), delimiter)

        // Initialize AI and counters
        // embedModel removed, we instantiate per request in processRecord or pass genAI
        const stats = { processed: 0 }
        let errors: string[] = []

        // --- Vertical/List Format Detection & Processing ---
        if (headers.length < 2) {
            console.log("Detecting Vertical/List format...")
            const potentialHeaders = []
            let headerEndIndex = 0

            for (let i = 0; i < lines.length && i < 20; i++) {
                const val = lines[i].trim().toLowerCase()
                if ((val.match(/^\d+$/) || val.match(/202\d-\d\d/)) && potentialHeaders.length > 3) {
                    break
                }
                potentialHeaders.push(lines[i].trim())
                headerEndIndex = i
            }

            if (potentialHeaders.length >= 3) {
                const vHeaders = potentialHeaders.map(h => h.toLowerCase())
                const vIdx = {
                    id: vHeaders.findIndex(h => h.includes('id')),
                    company: vHeaders.findIndex(h => h.includes('company') || h.includes('name')),
                    industry: vHeaders.findIndex(h => h.includes('industry') || h.includes('vertical')),
                    region: vHeaders.findIndex(h => h.includes('region') || h.includes('location') || h.includes('country')),
                    spend: vHeaders.findIndex(h => h.includes('spend') || h.includes('amount') || h.includes('revenue') || h.includes('value')),
                    date: vHeaders.findIndex(h => h.includes('date') || h.includes('last')),
                    products: vHeaders.findIndex(h => h.includes('product') || h.includes('purchase'))
                }

                console.log(`Vertical Headers detected: ${JSON.stringify(vHeaders)}`)
                const vDataLines = lines.slice(headerEndIndex + 1)
                const recordSize = vHeaders.length

                let currentLineIdx = 0
                while (currentLineIdx < vDataLines.length) {
                    let recordValues: string[] = []
                    for (let k = 0; k < recordSize; k++) {
                        if (currentLineIdx + k < vDataLines.length) {
                            recordValues.push(vDataLines[currentLineIdx + k])
                        }
                    }
                    if (recordValues.length < recordSize) break

                    // SMART MERGING LOGIC
                    if (vIdx.spend > -1) {
                        let spendVal = recordValues[vIdx.spend]
                        const cleanSpend = spendVal.replace(/[^0-9.]/g, '')
                        if (!cleanSpend || isNaN(parseFloat(cleanSpend))) {
                            if (currentLineIdx + recordSize < vDataLines.length) {
                                const offsetLimit = 5
                                let offsetFound = -1
                                for (let m = 0; m < offsetLimit; m++) {
                                    let peekIdx = vIdx.spend + m
                                    let peekVal = (peekIdx < recordValues.length) ? recordValues[peekIdx] : vDataLines[currentLineIdx + peekIdx]
                                    if (peekVal && peekVal.replace(/[^0-9,]/g, '').match(/^\d{3,}$/)) {
                                        offsetFound = m
                                        break
                                    }
                                }

                                if (offsetFound > 0) {
                                    const fieldBeforeSpend = vIdx.spend - 1
                                    if (fieldBeforeSpend >= 0) {
                                        recordValues = []
                                        let ptr = currentLineIdx
                                        for (let i = 0; i < recordSize; i++) {
                                            let val = vDataLines[ptr] || ""
                                            ptr++
                                            if (i === fieldBeforeSpend) {
                                                for (let e = 0; e < offsetFound; e++) {
                                                    val += " " + (vDataLines[ptr] || "")
                                                    ptr++
                                                }
                                            }
                                            recordValues.push(val)
                                        }
                                        currentLineIdx = ptr
                                    }
                                } else {
                                    currentLineIdx += recordSize
                                }
                            } else {
                                currentLineIdx += recordSize
                            }
                        } else {
                            currentLineIdx += recordSize
                        }
                    } else {
                        currentLineIdx += recordSize
                    }

                    await processRecord(recordValues, vIdx, genAI, stats, errors)
                }

                return NextResponse.json({
                    success: true,
                    processed: stats.processed,
                    errors,
                    debug_info: { mode: "vertical", headers: vHeaders }
                })
            }
        }

        // --- Standard CSV Format Processing ---
        const idx = {
            id: headers.findIndex(h => h.includes('id')),
            company: headers.findIndex(h => h.includes('company') || h.includes('name')),
            industry: headers.findIndex(h => h.includes('industry') || h.includes('vertical')),
            region: headers.findIndex(h => h.includes('region') || h.includes('location') || h.includes('country')),
            spend: headers.findIndex(h => h.includes('spend') || h.includes('amount') || h.includes('revenue') || h.includes('value')),
            date: headers.findIndex(h => h.includes('date') || h.includes('last')),
            products: headers.findIndex(h => h.includes('product') || h.includes('purchase'))
        }

        const dataLines = lines.slice(1)
        console.log(`Debug CSV: Processing ${dataLines.length} standard rows...`)

        for (const line of dataLines) {
            const cols = parseCSVLine(line, delimiter)
            if (cols.length < 2) continue
            // Pass genAI to helper instead of pre-initialized embedModel
            await processRecord(cols, idx, genAI, stats, errors)
        }

        return NextResponse.json({
            success: true,
            processed: stats.processed,
            errors,
            debug_info: {
                total_lines: lines.length,
                headers_detected: headers,
                indices: idx
            }
        })

    } catch (e: any) {
        console.error("Ingest API Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

async function processRecord(cols: string[], idx: any, genAI: any, stats: { processed: number }, errors: string[]) {
    const company = idx.company > -1 ? cols[idx.company] : (idx.id > -1 ? cols[idx.id] : "Unknown")
    const industry = idx.industry > -1 ? cols[idx.industry] : "Unknown"
    const region = idx.region > -1 ? cols[idx.region] : "Unknown"
    const spend = idx.spend > -1 ? parseFloat(cols[idx.spend].replace(/[^0-9.]/g, '')) || 0 : 0
    const date = idx.date > -1 ? cols[idx.date] : null
    const products = idx.products > -1 ? cols[idx.products] : ""
    const extId = idx.id > -1 ? cols[idx.id] : null

    const semanticText = `${company} is a customer in the ${industry} industry located in ${region}. They have purchased: ${products}. Total lifetime value: $${spend}.`

    // Robust Date Parser
    let parsedDate = new Date()
    if (date) {
        // Handle DD-MM-YYYY format common in some regions (e.g. 15-01-2023)
        const ddmmyyyy = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddmmyyyy) {
            const [_, d, m, y] = ddmmyyyy
            parsedDate = new Date(`${y}-${m}-${d}`)
        } else {
            const d = new Date(date)
            if (!isNaN(d.getTime())) {
                parsedDate = d
            }
        }
    }

    if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date() // Fallback to now if invalid
    }

    // Retry logic for embedding
    let embedding: number[] | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    while (!embedding && retryCount < maxRetries) {
        try {
            // Fallback to older model if improved one is not available
            const embedModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
            const result = await embedModel.embedContent(semanticText);
            embedding = result.embedding.values;
        } catch (e: any) {
            console.warn(`Embedding failed for ${company} (Attempt ${retryCount + 1}/${maxRetries}): ${e.message}`);
            if (e.message.includes('429') || e.message.includes('quota') || e.message.includes('Too Many Requests')) {
                // Exponential backoff + jitter
                const waitTime = Math.pow(2, retryCount) * 1000 + (Math.random() * 1000);
                console.log(`Waiting ${Math.round(waitTime)}ms before retry...`);
                await new Promise(r => setTimeout(r, waitTime));
                retryCount++;
            } else {
                throw e; // Non-transient error
            }
        }
    }

    if (!embedding) {
        throw new Error(`Failed to generate embedding for ${company} after ${maxRetries} attempts.`);
    }

    try {
        // Check if customer exists to prevent duplicates
        let custData;
        const { data: existingCust } = await supabase
            .from('crm_customers')
            .select('id')
            .eq('company_name', company)
            .eq('industry', industry)
            .maybeSingle()

        if (existingCust) {
            // Update existing
            const { data: updated, error: upError } = await supabase
                .from('crm_customers')
                .update({
                    total_spend: spend, // Could sum it up technically, but overwrite for now
                    last_purchase_date: parsedDate.toISOString(),
                    embedding: embedding
                })
                .eq('id', existingCust.id)
                .select()
                .single()

            if (upError) throw upError
            custData = updated
        } else {
            // Insert new
            const { data: inserted, error: insError } = await supabase
                .from('crm_customers')
                .insert({
                    external_id: extId,
                    company_name: company,
                    industry: industry,
                    region: region,
                    total_spend: spend,
                    last_purchase_date: parsedDate.toISOString(),
                    embedding: embedding
                })
                .select()
                .single()

            if (insError) throw insError
            custData = inserted
        }



        if (products && custData) {
            const productList = products.split(/[;,]/).map((p: string) => p.trim()).filter((p: string) => p)
            for (const p of productList) {
                try {
                    await supabase.from('crm_purchases').insert({
                        customer_id: custData.id,
                        product_name: p,
                        category: "General",
                        amount: 0,
                        purchase_date: new Date().toISOString()
                    })
                } catch (pdErr) {
                    // ignore
                }
            }
        }

        stats.processed++
        // Rate limit: Free tier allows ~15 RPM. 
        // We wait 1.5 seconds between requests to be safe (60/1.5 = 40 RPM, still risky, let's go 2s)
        await new Promise(r => setTimeout(r, 2000))

    } catch (err: any) {
        console.error(`Error processing ${company}:`, err)
        errors.push(`${company}: ${err.message}`)
    }
}
