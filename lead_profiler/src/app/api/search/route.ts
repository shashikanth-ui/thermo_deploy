import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
    if (!genAI) return NextResponse.json({ error: "AI not configured" }, { status: 500 })

    try {
        const body = await req.json()
        const { query } = body
        if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 })

        const debugLogs: string[] = []

        // ---------------------------------------------------------
        // STRATEGY 1: KEYWORD SEARCH (Split Terms)
        // ---------------------------------------------------------
        const terms = query.split(/\s+/).filter((t: string) => t.length > 2)
        let keywordMatches: any[] = []

        if (terms.length > 0) {
            const conditions: string[] = []
            terms.forEach((term: string) => {
                conditions.push(`company_name.ilike.%${term}%`)
                conditions.push(`industry.ilike.%${term}%`)
                conditions.push(`description.ilike.%${term}%`)
            })
            const orQuery = conditions.join(',')

            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .or(orQuery)
                .limit(10)

            if (error) debugLogs.push(`Text Search Error: ${error.message}`)
            if (data) keywordMatches = data
        }

        // ---------------------------------------------------------
        // STRATEGY 2: VECTOR SEARCH
        // ---------------------------------------------------------
        let vectorMatches: any[] = []
        try {
            const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" })
            const embedResult = await embedModel.embedContent(query)
            const embedding = embedResult.embedding.values

            const { data: rpcMatches, error: rpcError } = await supabase.rpc('match_accounts', {
                query_embedding: embedding,
                match_threshold: 0.0,
                match_count: 10
            })

            if (rpcError) {
                debugLogs.push(`Vector RPC Error: ${rpcError.message}`)
            } else if (rpcMatches && rpcMatches.length > 0) {
                const ids = rpcMatches.map((m: any) => m.id)
                const { data: accounts } = await supabase.from('accounts').select('*').in('id', ids)
                vectorMatches = rpcMatches.map((m: any) => {
                    const acc = accounts?.find(a => a.id === m.id)
                    return acc ? { ...acc, similarity: m.similarity } : null
                }).filter(Boolean)
            }
        } catch (vecErr: any) {
            debugLogs.push(`Vector Generation Error: ${vecErr.message}`)
        }

        // ---------------------------------------------------------
        // COMBINE
        // ---------------------------------------------------------
        const allMatches = [...keywordMatches, ...vectorMatches]
        const unique = new Map()
        allMatches.forEach(item => {
            if (!unique.has(item.id)) unique.set(item.id, item)
        })
        const finalResults = Array.from(unique.values()).slice(0, 10)

        if (finalResults.length === 0) {
            return NextResponse.json({
                results: [],
                answer: "No results found. Debug Info: " + debugLogs.join('; ')
            })
        }

        // ---------------------------------------------------------
        // AI SYNTHESIS - SAFE WRAPPED with STABLE MODEL
        // ---------------------------------------------------------
        let answer = ""
        try {
            // Use stable model 'gemini-pro' to prevent 404s
            const synthesisModel = genAI.getGenerativeModel({ model: "gemini-pro" })

            const topContext = finalResults.slice(0, 5)
            const contextText = topContext.map((a: any) =>
                `- ${a.company_name} (${a.industry}): ${a.description || a.executive_summary}`
            ).join('\n')

            const prompt = `
            You are a Sales Intelligence AI. 
            User Query: "${query}"
            Results:
            ${contextText}
            
            Summarize the best fit in 2 sentences.
            `
            const answerResult = await synthesisModel.generateContent(prompt)
            answer = answerResult.response.text()
        } catch (aiErr: any) {
            console.error("AI Summary Failed:", aiErr.message)
            answer = "AI Summary unavailable (Model Error), but matches are listed below."
        }

        return NextResponse.json({
            results: finalResults,
            answer: answer
        })

    } catch (e: any) {
        console.error("Global Search Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
