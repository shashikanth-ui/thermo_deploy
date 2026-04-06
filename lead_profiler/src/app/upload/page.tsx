'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UploadPage() {
    const [loading, setLoading] = useState(false)

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
        const file = e.target.files?.[0]
        if (!file) return

        const text = await file.text()
        const lines = text.split('\n')
        // Simple header parsing
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\r\n]+/g, ''))

        const rows = lines.slice(1).map(row => {
            if (!row.trim()) return null
            const values = row.split(',').map(v => v.trim())

            // 1. Identify Core Fields
            // We look for headers or fall back to index 0 and 1
            const nameIdx = headers.findIndex(h => h.includes('company') || h.includes('name'))
            const websiteIdx = headers.findIndex(h => h.includes('web') || h.includes('url'))

            const company_name = (nameIdx > -1 ? values[nameIdx] : values[0])?.replace(/['"]/g, '')
            const website = (websiteIdx > -1 ? values[websiteIdx] : values[1])?.replace(/['"]/g, '')

            if (!company_name) return null

            // 2. Capture Rich Data (Everything else goes to raw_data)
            const extraData: any = {}
            headers.forEach((h, i) => {
                const val = values[i]?.replace(/[\r\n]+/g, '')
                if (val) {
                    // Normalize standard keys for our UI
                    if (h.includes('funnel') || h.includes('stage')) extraData.funnel_stage = val
                    else if (h.includes('deal') || h.includes('value')) extraData.deal_value = val
                    else if (h.includes('decision') || h.includes('contact')) {
                        extraData.decision_maker = { name: val, designation: 'Unknown' } // simplistic mapping
                    }
                    else if (h.includes('designation') || h.includes('title')) {
                        if (extraData.decision_maker) extraData.decision_maker.designation = val
                    }
                    else extraData[h] = val
                }
            })

            return {
                company_name: company_name,
                website: website || null,
                raw_data: extraData
            }
        }).filter(Boolean)

        const { error } = await supabase
            .from('prospects')
            .insert(rows)

        setLoading(false)
        if (error) alert('error: ' + error.message)
        else {
            // alert(`${rows.length} companies loaded with rich data!`)
            window.location.href = '/'
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Upload 100 Companies CSV</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Format: company_name,website (website optional)</p>
                    <Input type="file" accept=".csv" onChange={handleCsvUpload} disabled={loading} />
                    <Button className="mt-4" onClick={() => window.location.href = '/'}>
                        View Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
