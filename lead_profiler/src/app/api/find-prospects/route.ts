
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

// Fallback for schema: we will try to insert "source" and "website". 
// If it fails, we will pack them into "description".
// However, Supabase client throws error on unknown columns before request sometimes if strict.
// We will try to add columns via SQL first.
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function searchTavily(query: string) {
    if (!TAVILY_API_KEY) return []
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5
            })
        })
        const data = await response.json()
        return data.results || []
    } catch (e) {
        console.error("Tavily Search Error:", e)
        return []
    }
}

export async function POST(req: NextRequest) {
    try {
        console.log("Find Prospects: Starting...")

        // 1. Get high-value customers for "Target Vector"
        const { data: topCustomers, error: crmError } = await supabase
            .from('crm_customers')
            .select('id, embedding, company_name, industry')
            .order('total_spend', { ascending: false })
            .limit(50) // Fetch more for deduping

        if (crmError) throw crmError
        if (!topCustomers || topCustomers.length === 0) {
            return NextResponse.json({ message: "No CRM data to build profile." })
        }

        // Deduplicate
        const uniqueCustomers = [];
        const seen = new Set();
        for (const c of topCustomers) {
            if (!seen.has(c.company_name)) {
                uniqueCustomers.push(c);
                seen.add(c.company_name);
            }
            if (uniqueCustomers.length >= 10) break;
        }

        // Use unique list for logic
        const usingCustomers = uniqueCustomers;

        // 1.5 Get Top Products from CRM History
        // 1.5 Get Top Products from CRM History
        const { data: purchaseData } = await supabase
            .from('crm_purchases')
            .select('product_name')
            .in('customer_id', usingCustomers.map(c => c.id))

        const frequentProducts = new Set(purchaseData?.map((p: any) => p.product_name) || [])
        const productList = Array.from(frequentProducts).slice(0, 3)
        const topIndustries = Array.from(new Set(usingCustomers.map(c => c.industry))).slice(0, 2)

        // --- AGENTIC WORKFLOW START ---
        // 2. Generate Search Query using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        const prompt = `
        We are looking for B2B prospects similar to our existing high-value customers.
        Top Industries: ${topIndustries.join(', ')}
        Top Products Bought: ${productList.join(', ')}

        Generate a specific search query to find companies that might use these products or are in this industry. 
        Focus on finding "lists of companies" or "competitors" or "market reports".
        Changes: Return ONLY the raw query string. No quotes.
        `
        const result = await model.generateContent(prompt)
        const searchQuery = result.response.text().trim()
        console.log(`Agent Query: ${searchQuery}`)

        // 3. Execute Tavily Search
        const searchResults = await searchTavily(searchQuery)
        console.log(`Tavily found ${searchResults.length} results.`)

        // 4. Process & Deduplicate Results
        // We will "Soft Match" against DB to avoid duplicates
        const { data: existingProspects } = await supabase
            .from('prospects')
            .select('company_name')

        const existingNames = new Set(existingProspects?.map(p => p.company_name.toLowerCase()) || [])
        const newProspects = []

        for (const res of searchResults) {
            // Extract company name from title or content (Simplistic extraction)
            // Ideally we ask Gemini to extract structured data from the search result snippet
            const extractPrompt = `
            Extract the Company Name and a brief Description from this search result.
            Result Title: ${res.title}
            Result Content: ${res.content}
            
            Return JSON: { "company_name": "Name", "description": "Desc", "industry": "Industry" }
            `
            try {
                const extraction = await model.generateContent(extractPrompt)
                const text = extraction.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
                const json = JSON.parse(text)

                if (json.company_name && !existingNames.has(json.company_name.toLowerCase())) {
                    // Generate Embedding for the new prospect
                    // Use model compatible with DB (we switched to 001 for 3072 dim)
                    const embedModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" })
                    const embedRes = await embedModel.embedContent(`${json.company_name} ${json.description}`)

                    newProspects.push({
                        company_name: json.company_name,
                        // Pack metadata into description for safe storage without schema migration
                        description: `[Source: Agent] [Website: ${res.url}] ${json.description}`,
                        industry: json.industry || topIndustries[0],
                        embedding: embedRes.embedding.values,
                        competitor_stack: []
                    })
                    existingNames.add(json.company_name.toLowerCase())
                }
            } catch (e) {
                // Ignore extraction failures
            }
        }

        // 5. Insert New Prospects into DB (Persistence)
        if (newProspects.length > 0) {
            const { error: insertError } = await supabase.from('prospects').insert(newProspects)
            if (insertError) console.error("Error inserting agent prospects:", insertError)
            else console.log(`Agent inserted ${newProspects.length} new prospects.`)
        }

        // --- AGENTIC WORKFLOW END ---


        // 6. Build Centroid & Search (Standard logic)
        const dim = 3072
        let centroid = new Array(dim).fill(0)
        let count = 0
        for (const c of usingCustomers) {
            if (!c.embedding) continue
            let vec: number[]
            if (typeof c.embedding === 'string') {
                try { vec = JSON.parse(c.embedding) } catch (e) { continue }
            } else {
                vec = c.embedding
            }
            if (!vec || vec.length !== dim) continue
            for (let i = 0; i < dim; i++) centroid[i] += vec[i]
            count++
        }

        if (count > 0) {
            centroid = centroid.map(val => val / count)
        }

        // 7. Fetch Unified List (DB + Agent Findings)
        // Refresh valid list
        const { data: allProspects, error: fetchError } = await supabase
            .from('prospects')
            .select('*')

        if (fetchError) throw fetchError

        // Score
        const scoredProspects = allProspects?.map(p => {
            let sim = 0
            if (count > 0 && p.embedding) {
                let pVec: number[]
                if (typeof p.embedding === 'string') {
                    try { pVec = JSON.parse(p.embedding) } catch (e) { pVec = [] }
                } else {
                    pVec = p.embedding
                }
                if (pVec && pVec.length === dim) {
                    sim = cosineSimilarity(centroid, pVec)
                }
            }
            // Boost Agent findings slightly to ensure they show up
            if (p.source === 'agent-tavily') sim += 0.05
            return { ...p, similarity: sim }
        }) || []

        scoredProspects.sort((a, b) => b.similarity - a.similarity)
        const prospects = scoredProspects.slice(0, 20)

        // 8. Enrich
        const { data: battlecards } = await supabase.from('competitive_battlecards').select('*')
        const enrichedProspects = prospects.map((p: any) => {
            let stack = p.competitor_stack
            if (!stack || stack.length === 0) {
                // For Agent findings, look for keywords in description
                const desc = (p.description || "").toLowerCase()
                if (desc.includes("illumina")) stack = ["Illumina"]
                else if (desc.includes("thermo")) stack = ["Thermo Fisher"] // Existing customer?
                else stack = ["Unknown"]
            } else if (typeof stack === 'string') {
                stack = stack.replace(/[{}"\\]/g, '').split(',')
            }

            let strategy = "Standard outreach."
            let intel = null
            // Logic for strategy...
            if (p.description && p.description.includes('[Source: Agent]')) {
                strategy = "New AI Discovery: Validate fit and competitor usage."
            }

            // Keep existing logic for demo purposes
            let commonProducts: string[] = []
            if (frequentProducts.size > 0 && Array.isArray(stack)) {
                commonProducts = stack.filter((s: string) => Array.from(frequentProducts).some((fp: any) => s.toLowerCase().includes(fp.toLowerCase()) || fp.toLowerCase().includes(s.toLowerCase())))
            }
            if (commonProducts.length > 0) {
                strategy = `High Intent: Uses ${commonProducts.join(', ')}`
            }

            return {
                ...p,
                competitor_stack: stack,
                win_strategy: strategy,
                competitive_intel: intel,
                similarity_score: p.similarity
            }
        })

        return NextResponse.json({
            success: true,
            prospects: enrichedProspects,
            debug_info: {
                method: "agent-tavily-vector",
                agent_query: searchQuery,
                new_findings: newProspects.length
            }
        })

    } catch (e: any) {
        console.error("Prospect Search Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
