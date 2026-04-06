
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
    try {
        // 1. Fetch Patterns
        const { data: patterns } = await supabase.from('crm_patterns').select('*')

        // 2. Fetch Top Customers
        const { data: customers } = await supabase
            .from('crm_customers')
            .select('*')
            .order('total_spend', { ascending: false })
            .limit(50) // Fetch more to allow for duplicates

        // Deduplicate customers
        const uniqueCustomers = [];
        const seen = new Set();
        if (customers) {
            for (const c of customers) {
                if (!seen.has(c.company_name)) {
                    uniqueCustomers.push(c);
                    seen.add(c.company_name);
                }
            }
        }

        const topUniqueCustomers = uniqueCustomers.slice(0, 20);

        if (!patterns || patterns.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No analysis found. Run analysis first."
            })
        }

        // Reconstruct analysis object
        const analysis = {
            icp_summary: "Based on historical analysis.", // We didn't store summary in a table, might be nice to add later. For now generic.
            dominant_industries: patterns[0]?.affected_industries || [],
            buying_patterns: patterns.map(p => ({
                name: p.pattern_name,
                description: p.description,
                confidence: p.confidence_score
            })),
            recommended_strategy: "Leverage identified buying patterns for targeted outreach."
        }

        return NextResponse.json({ success: true, analysis, top_customers: topUniqueCustomers })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
