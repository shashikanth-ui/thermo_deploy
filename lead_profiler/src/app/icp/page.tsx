'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Save, Target, CheckCircle2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// IMPORTANT: In a real app, move this to a context or lib file
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ICPBuilder() {
    const [isLoading, setIsLoading] = useState(false)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const [icpData, setIcpData] = useState({
        name: 'Strategic SaaS Target',
        target_industries: 'B2B SaaS, Fintech',
        company_size_range: '50-500',
        revenue_range: '$10M - $100M',
        key_characteristics: 'High growth, Recent funding, Hiring for Sales',
        description: ''
    })

    const generateProfile = async () => {
        setIsLoading(true)
        setNotification(null)

        try {
            const res = await fetch('/api/generate-icp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: icpData.name,
                    industries: icpData.target_industries,
                    size: icpData.company_size_range,
                    revenue: icpData.revenue_range,
                    characteristics: icpData.key_characteristics
                })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to generate')

            setIcpData(prev => ({
                ...prev,
                description: data.description
            }))
        } catch (err: any) {
            console.error(err)
            setNotification({ type: 'error', message: 'AI Generation Failed: ' + err.message })
        } finally {
            setIsLoading(false)
        }
    }

    const saveProfile = async () => {
        setIsLoading(true)
        setNotification(null)

        try {
            const { error } = await supabase.from('icp_definitions').insert({
                name: icpData.name,
                target_industries: icpData.target_industries.split(',').map(s => s.trim()),
                company_size_range: icpData.company_size_range,
                revenue_range: icpData.revenue_range,
                key_characteristics: icpData.key_characteristics.split(',').map(s => s.trim()),
                description: icpData.description,
                is_active: true // Set as active by default
            })

            if (error) throw error

            setNotification({ type: 'success', message: 'ICP Profile Saved Successfully!' })
        } catch (err: any) {
            console.error(err)
            setNotification({ type: 'error', message: 'Failed to save: ' + err.message })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen text-foreground bg-gradient-to-br from-black via-zinc-900 to-indigo-950/20">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'}>
                        <ArrowLeft className="size-5 text-muted-foreground hover:text-white" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                            <Target className="size-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">ICP Builder</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Input Form */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Define Your Ideal Customer</h1>
                            <p className="text-muted-foreground">
                                The AI uses this profile to score leads and find look-alikes. Be specific.
                            </p>
                        </div>

                        <Card className="glass-panel border-white/10 bg-white/5">
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Profile Name</label>
                                    <Input
                                        placeholder="e.g. Enterprise Fintech"
                                        value={icpData.name}
                                        onChange={(e) => setIcpData({ ...icpData, name: e.target.value })}
                                        className="bg-black/20 border-white/10 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Industries</label>
                                        <Input
                                            placeholder="SaaS, Finance..."
                                            value={icpData.target_industries}
                                            onChange={(e) => setIcpData({ ...icpData, target_industries: e.target.value })}
                                            className="bg-black/20 border-white/10 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Company Size</label>
                                        <Input
                                            placeholder="50-1000"
                                            value={icpData.company_size_range}
                                            onChange={(e) => setIcpData({ ...icpData, company_size_range: e.target.value })}
                                            className="bg-black/20 border-white/10 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Revenue Range</label>
                                    <Input
                                        placeholder="$10M - $100M"
                                        value={icpData.revenue_range}
                                        onChange={(e) => setIcpData({ ...icpData, revenue_range: e.target.value })}
                                        className="bg-black/20 border-white/10 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Key Buying Signals (comma sep)</label>
                                    <Textarea
                                        placeholder="Hiring sales reps, Recent Funding, New CTO..."
                                        className="bg-black/20 border-white/10 text-white min-h-[100px]"
                                        value={icpData.key_characteristics}
                                        onChange={(e) => setIcpData({ ...icpData, key_characteristics: e.target.value })}
                                    />
                                </div>

                                <Button
                                    onClick={generateProfile}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity"
                                    disabled={isLoading}
                                >
                                    <Sparkles className="size-4 mr-2" />
                                    Generate AI Profile Summary
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Preview & Save */}
                    <div className="space-y-6">
                        <div className="hidden md:block h-[92px]"></div> {/* Spacer for alignment */}

                        <Card className="glass-panel border border-indigo-500/30 bg-indigo-950/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Target className="size-32 text-indigo-500" />
                            </div>

                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Target Profile Preview
                                    {icpData.description && <CheckCircle2 className="size-4 text-green-400" />}
                                </CardTitle>
                                <CardDescription>How the AI sees your ideal customer.</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 relative z-10">
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">Strategy Name</div>
                                    <div className="text-xl font-bold">{icpData.name || 'Untitled Strategy'}</div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">AI Summary</div>
                                    <div className="text-sm leading-relaxed text-slate-300 min-h-[100px] border-l-2 border-indigo-500/50 pl-4 py-1">
                                        {icpData.description || (
                                            <span className="text-muted-foreground/50 italic">
                                                Click "Generate AI Profile Summary" to create a detailed description based on your inputs...
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Win Rate Potential</div>
                                        <div className="text-2xl font-bold text-green-400">High</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Market Size</div>
                                        <div className="text-2xl font-bold text-white">~2.4k Accounts</div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    size="lg"
                                    onClick={saveProfile}
                                    disabled={isLoading || !icpData.description}
                                    className="w-full bg-white text-black hover:bg-gray-200"
                                >
                                    {isLoading ? 'Saving...' : 'Save & Activate Profile'}
                                    <Save className="size-4 ml-2" />
                                </Button>
                            </CardFooter>
                        </Card>

                        {notification && (
                            <div className={`p-4 rounded-lg border ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {notification.type === 'success' ? <CheckCircle2 className="size-4" /> : null}
                                    {notification.message}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
