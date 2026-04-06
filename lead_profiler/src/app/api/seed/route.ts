import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
    if (!genAI) {
        return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 })
    }

    try {
        const filePath = path.join(process.cwd(), '..', 'backend', 'data', 'b2b_saas_targets.csv')
        console.log(`Reading CSV from: ${filePath}`)

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "CSV file not found at " + filePath }, { status: 404 })
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8')
        // Robust splitting
        const lines = fileContent.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim().length > 0)

        // Skip header
        const dataLines = lines.slice(1)

        console.log(`Found ${lines.length} lines. Processing ${dataLines.length} data rows...`)

        const embedModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" })
        let processed = 0
        let errors: string[] = []

        for (const line of dataLines) {
            const cols = line.split(',').map(c => c.trim())

            // Check if valid row
            if (cols.length < 5) {
                console.warn(`Skipping invalid line (cols=${cols.length}): ${line}`)
                continue
            }

            const [name, website, industry, employees, revenue] = cols
            const semanticText = `${name} is a B2B SaaS company in the ${industry} space. Size: ${employees} employees. Annual Revenue: ${revenue}.`

            try {
                // Generate Embedding
                const result = await embedModel.embedContent(semanticText)
                const embedding = result.embedding.values

                // Upsert
                const { error } = await supabase.from('accounts').upsert({
                    company_name: name,
                    website: website,
                    industry: industry,
                    employee_count: employees,
                    revenue_range: revenue,
                    description: semanticText,
                    fit_score: 85,
                    embedding: embedding,
                    executive_summary: `Pre-qualified target account in ${industry}.`
                }, { onConflict: 'company_name' as any })

                if (error) {
                    console.error(`Supabase Error for ${name}:`, error)
                    errors.push(`${name}: ${error.message}`)
                } else {
                    processed++
                }

                // Rate Limit Buffer
                await new Promise(r => setTimeout(r, 100))

            } catch (err: any) {
                console.error(`AI Error for ${name}:`, err)
                errors.push(`${name}: ${err.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${processed} accounts.` + (errors.length ? ` (with ${errors.length} errors)` : ''),
            count: processed,
            debug_errors: errors
        })

    } catch (e: any) {
        console.error("Seed API Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
