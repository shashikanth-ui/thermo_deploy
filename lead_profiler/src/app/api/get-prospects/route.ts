
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { data: prospects, error } = await supabase
            .from('prospects')
            .select('*')
            .limit(50)

        if (error) throw error

        // Enrich with battlecards logic (simplified duplicate of main logic)
        const enriched = prospects.map(p => {
            // Parse simplified metadata
            let stack = p.competitor_stack
            if (typeof stack === 'string') stack = stack.replace(/[{}"\\]/g, '').split(',')
            if (!stack || stack.length === 0) stack = []

            let strategy = p.win_strategy || "Standard outreach."
            if (p.description && p.description.includes('[Source: Agent]')) {
                strategy = "New AI Discovery: Validate fit and competitor usage."
            }

            return {
                ...p,
                competitor_stack: stack,
                win_strategy: strategy
            }
        })

        return NextResponse.json({ success: true, prospects: enriched })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
