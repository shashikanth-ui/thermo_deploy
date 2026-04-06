import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
    try {
        const { prospect } = await req.json()

        if (!prospect) {
            return NextResponse.json({ error: 'No prospect data provided' }, { status: 400 })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `
You are a B2B sales intelligence analyst for ThermoFisher Scientific, a world-leading life sciences company.

A prospect has been identified as a potential customer match. Generate a concise, professional AI match summary explaining why this company is a strong fit.

Prospect Details:
- Company: ${prospect.company_name}
- Industry: ${prospect.industry || 'Unknown'}
- Description: ${prospect.desc || prospect.description || 'No description available'}
- Win Strategy: ${prospect.win_strategy || 'Fit based on ICP overlap'}
- Revenue Range: ${prospect.revenue_range || 'Unknown'}
- Employee Count: ${prospect.employee_count || 'Unknown'}

Write a 3-sentence summary that:
1. States the key reason this company matches ThermoFisher's ideal customer profile
2. Highlights their likely product/research needs that ThermoFisher can fulfil
3. Suggests the best sales angle or entry point

Be specific, confident, and data-driven. Write in plain English, no bullet points, no headers. Keep it under 80 words.
`

        const result = await model.generateContent(prompt)
        const summary = result.response.text().trim()

        return NextResponse.json({ success: true, summary })

    } catch (e: any) {
        console.error('Match Summary Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
