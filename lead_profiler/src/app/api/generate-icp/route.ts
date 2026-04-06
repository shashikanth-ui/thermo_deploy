
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export async function POST(req: NextRequest) {
    if (!genAI) {
        return NextResponse.json(
            { error: "AI configuration missing" },
            { status: 500 }
        )
    }

    try {
        const body = await req.json()
        const { name, industries, size, revenue, characteristics } = body

        const prompt = `
        You are a B2B Strategy Consultant.
        Your client is defining their Ideal Customer Profile (ICP).
        
        Inputs:
        - Strategy Name: ${name}
        - Target Industries: ${industries}
        - Company Size: ${size}
        - Revenue Range: ${revenue}
        - Buying Signals/Characteristics: ${characteristics}

        Task:
        Write a concise, professional, and strategic "Executive Summary" (max 3 sentences) that describes this Ideal Customer. 
        Focus on the *persona* and the *why*. Use professional sales language.
        
        Example Output:
        "Our ideal customer is a high-growth B2B SaaS company with 50-500 employees, typically in the Fintech sector. They are likely Series B+ funded and actively scaling their sales organization to overcome funnel inefficiencies. Key stakeholders are VPs of Revenue Operations seeking data-driven tooling."
        
        Draft the summary now:
        `

        const modelNames = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash",
            "gemini-pro-latest"
        ];

        let result;
        for (const name of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                result = await model.generateContent(prompt);
                break;
            } catch (e: any) {
                console.warn(`Failed with ${name}: ${e.message}`);
                if (e.message.includes('429') || e.status === 429) {
                    await new Promise(r => setTimeout(r, 2000)); // Simple wait
                }
            }
        }

        if (!result) throw new Error("All AI models failed. Check quotas.");
        const description = result.response.text().trim()

        return NextResponse.json({ description })
    } catch (error: any) {
        console.error("Generate ICP Error:", error)
        return NextResponse.json(
            { error: error.message || "Failed to generate profile" },
            { status: 500 }
        )
    }
}
