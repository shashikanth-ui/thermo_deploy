
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Target, TrendingUp, Search } from 'lucide-react'

export default function CrmIntelligencePage() {
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

    useEffect(() => {
        const loadAnalysis = async () => {
            try {
                const res = await fetch('/api/get-analysis')
                const data = await res.json()
                if (data.success && data.top_customers && data.top_customers.length > 0) {
                    setTopCustomers(data.top_customers)
                }
            } catch (e) { /* silent */ }
        }
        loadAnalysis()
    }, [])

    return (
        <div className="min-h-screen text-foreground relative">

            {/* Header — ThermoFisher */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="bg-white rounded-lg px-3 py-1.5">
                            <img src="/thermofisher-logo.png" alt="ThermoFisher Scientific" className="h-7 w-auto object-contain" />
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" onClick={() => window.location.href = '/'}>
                        ← Back
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 space-y-8">

                {/* Top Ideal Customer Profiles */}
                {topCustomers.length > 0 ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2">
                            <Users className="text-indigo-400 size-5" />
                            <h2 className="text-2xl font-bold">Top Ideal Customer Profiles</h2>
                        </div>
                        <p className="text-muted-foreground">Click on a profile to view their buying pattern &amp; strategy.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topCustomers.map((c: any) => (
                                <Card
                                    key={c.id}
                                    className="glass-panel border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all hover:scale-[1.02] group"
                                    onClick={() => setSelectedCustomer(c)}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex justify-between">
                                            {c.company_name}
                                            <span className="text-xs font-normal px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                                ${c.total_spend?.toLocaleString()}
                                            </span>
                                        </CardTitle>
                                        <CardDescription>{c.industry} • {c.region}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            {c.ai_buying_pattern || 'Click to see analysis...'}
                                        </div>
                                        <div className="mt-4 text-xs text-indigo-400 flex items-center gap-1 group-hover:underline">
                                            View Strategy <Target className="size-3" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-4 text-muted-foreground">
                        <Users className="size-12 opacity-30" />
                        <p className="text-lg">No ideal customer profiles found.</p>
                        <p className="text-sm opacity-60">Run the agent on the home page to generate profiles.</p>
                    </div>
                )}

                {/* Prospect Discovery Button */}
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => window.location.href = '/prospects'}
                        className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.99]"
                    >
                        <Search className="size-5" />
                        Find Look-alike Customers
                    </button>
                </div>

            </main>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedCustomer(null)}
                >
                    <div
                        className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold">{selectedCustomer.company_name}</h3>
                                <p className="text-muted-foreground">{selectedCustomer.industry} • {selectedCustomer.region}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Close</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Total Spend</span>
                                <div className="text-2xl font-mono text-green-400">${selectedCustomer.total_spend?.toLocaleString()}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Last Purchase</span>
                                <div className="text-lg">{new Date(selectedCustomer.last_purchase_date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <h4 className="flex items-center gap-2 font-semibold text-indigo-400 mb-2">
                                    <TrendingUp className="size-4" /> Buying Pattern Analysis
                                </h4>
                                <p className="text-sm leading-relaxed">{selectedCustomer.ai_buying_pattern || 'Analysis pending...'}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <h4 className="flex items-center gap-2 font-semibold text-green-400 mb-2">
                                    <Target className="size-4" /> Marketing Strategy Advice
                                </h4>
                                <p className="text-sm leading-relaxed">{selectedCustomer.ai_strategy_advice || 'No specific strategy generated.'}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Dismiss</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
