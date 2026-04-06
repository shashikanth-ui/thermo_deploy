
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Sparkles, Building2, Globe, ArrowRight, X, TrendingUp, Zap } from 'lucide-react'

// Build a smart, contextual match summary entirely from the prospect's own data
function buildSummary(p: any, desc: string): string {
    const company = p.company_name || 'This company'
    const industry = p.industry || 'life sciences'
    const revenue = p.revenue_range ? ` with ${p.revenue_range} in annual revenue` : ''
    const headcount = p.employee_count ? ` and ${p.employee_count} employees` : ''
    const strategy = p.win_strategy || ''

    // Pick a product angle based on industry keywords
    const ind = industry.toLowerCase()
    let productAngle = 'laboratory consumables and analytical instruments'
    if (ind.includes('pharma') || ind.includes('drug')) productAngle = 'pharmaceutical-grade reagents, cell culture media, and analytical systems'
    else if (ind.includes('biotech') || ind.includes('bio')) productAngle = 'bioprocessing equipment, genomic reagents, and high-throughput screening tools'
    else if (ind.includes('hospital') || ind.includes('health') || ind.includes('medical')) productAngle = 'clinical diagnostics, immunoassay kits, and laboratory instrumentation'
    else if (ind.includes('research') || ind.includes('university') || ind.includes('academic')) productAngle = 'research-grade chemicals, PCR consumables, and mass spectrometry solutions'
    else if (ind.includes('food') || ind.includes('agri')) productAngle = 'food safety testing kits, chromatography systems, and environmental monitoring reagents'

    // Build win angle from strategy string
    let winLine = 'Their profile closely mirrors ThermoFisher\'s highest-value existing accounts, making them a prime outreach candidate.'
    if (strategy.toLowerCase().includes('high intent')) winLine = 'Their procurement signals indicate high buying intent, suggesting an active evaluation cycle that ThermoFisher can influence now.'
    else if (strategy.toLowerCase().includes('new ai discovery')) winLine = 'Identified by AI as an emerging match — proactive outreach can capture this account before competitors engage.'
    else if (strategy.toLowerCase().includes('competitor') || strategy.toLowerCase().includes('thermo')) winLine = 'Competitive overlap detected; a targeted displacement conversation around total cost of ownership could accelerate conversion.'

    return `${company} is a ${industry} organisation${revenue}${headcount} that aligns strongly with ThermoFisher\'s Ideal Customer Profile. Their scale and sector indicate recurring demand for ${productAngle}. ${winLine}`
}

export default function ProspectDiscoveryPage() {
    const [searching, setSearching] = useState(false)
    const [prospects, setProspects] = useState<any[]>([])
    const [selectedProspect, setSelectedProspect] = useState<any>(null)
    const [summaries, setSummaries] = useState<Record<string, string>>({})

    // Auto-build all summaries whenever prospect list changes
    const hydrateSummaries = (list: any[]) => {
        const next: Record<string, string> = {}
        list.forEach(raw => {
            const p = parse(raw)
            const key = p.id || p.company_name
            next[key] = buildSummary(p, p.desc)
        })
        setSummaries(next)
    }

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/get-prospects')
                const data = await res.json()
                if (data.success && data.prospects?.length > 0) {
                    setProspects(data.prospects)
                    hydrateSummaries(data.prospects)
                }
            } catch { }
        }
        load()
    }, [])

    const findProspects = async () => {
        setSearching(true)
        try {
            const res = await fetch('/api/find-prospects', { method: 'POST' })
            const data = await res.json()
            const list = data.prospects || []
            if (list.length > 0) {
                setProspects(list)
                hydrateSummaries(list)
            }
        } catch { /* silent — existing prospects stay visible */ }
        setSearching(false)
    }

    // Parse AI metadata out of description
    const parse = (p: any) => {
        let desc = p.description || 'No description available.'
        let isAiSourced = false
        let website: string | null = null
        if (desc.includes('[Source: Agent]')) {
            isAiSourced = true
            const m = desc.match(/\[Website: (.*?)\]/)
            if (m) { website = m[1]; desc = desc.replace(/\[Website: .*?\]/, '').replace(/\[Source: Agent\]/, '').trim() }
        }
        return { ...p, desc, isAiSourced, website }
    }

    return (
        <div className="min-h-screen text-foreground relative">

            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="bg-white rounded-lg px-3 py-1.5">
                            <img src="/thermofisher-logo.png" alt="ThermoFisher Scientific" className="h-7 w-auto object-contain" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" onClick={() => window.location.href = '/'}>Dashboard</Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" onClick={() => window.location.href = '/crm-intelligence'}>Ideal Customers</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 space-y-8">

                {/* Title + Find button */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Find Look-alike Customers</h1>
                        <p className="text-muted-foreground text-lg">AI-powered look-alike search based on your best customers.</p>
                    </div>
                    <Button size="lg" onClick={findProspects} disabled={searching} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30">
                        {searching ? <><Sparkles className="size-4 mr-2 animate-spin" />Scanning...</> : <><Search className="size-4 mr-2" />Find Look-alike Customers</>}
                    </Button>
                </div>



                {/* Prospect Cards */}
                {prospects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {prospects.map((raw, i) => {
                            const p = parse(raw)
                            const key = p.id || p.company_name
                            const sum = summaries[key]

                            return (
                                <Card key={key} className={`glass-panel flex flex-col border-white/5 bg-white/5 hover:bg-white/[0.07] transition-colors ${p.isAiSourced ? 'border-indigo-500/30' : ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-bold leading-snug">{p.company_name}</CardTitle>
                                            {p.isAiSourced
                                                ? <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0"><Sparkles className="size-3" />AI</span>
                                                : i < 3 && <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">TOP MATCH</span>
                                            }
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground text-xs mt-1">
                                            <span className="flex items-center gap-1"><Building2 className="size-3" />{p.industry}</span>
                                            {p.website && (
                                                <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white underline decoration-dotted">
                                                    <Globe className="size-3" />Website
                                                </a>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex flex-col flex-1 gap-4">
                                        {/* Company blurb */}
                                        <p className="text-xs text-muted-foreground line-clamp-2">{p.desc}</p>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {p.revenue_range && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">{p.revenue_range}</span>}
                                            {p.employee_count && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">{p.employee_count} employees</span>}
                                        </div>

                                        {/* AI Match Summary — always pre-built */}
                                        {sum && (
                                            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 space-y-1">
                                                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Zap className="size-3" /> AI Match Summary
                                                </p>
                                                <p className="text-xs leading-relaxed text-white/80">{sum}</p>
                                            </div>
                                        )}

                                        {/* Footer actions */}
                                        <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                                            <div className={`flex items-center gap-1 ${p.isAiSourced ? 'text-indigo-300' : 'text-green-400'}`}>
                                                <Sparkles className="size-3" />
                                                {p.isAiSourced ? 'New Discovery' : 'Strong Fit'}
                                            </div>
                                            <button
                                                onClick={() => setSelectedProspect(p)}
                                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                                            >
                                                View Profile <ArrowRight className="size-3" />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    !searching && (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                            <div className="inline-flex size-16 rounded-full bg-white/5 items-center justify-center mb-4">
                                <Search className="size-8 text-muted-foreground opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium text-muted-foreground">No prospects loaded</h3>
                            <p className="text-sm text-muted-foreground/50 mt-1 max-w-sm mx-auto">
                                Click "Find Look-alike Customers" to use the AI engine to sweep the database for matches.
                            </p>
                        </div>
                    )
                )}
            </main>

            {/* Detail Modal */}
            {selectedProspect && (() => {
                const key = selectedProspect.id || selectedProspect.company_name
                const sum = summaries[key]
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProspect(null)}>
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-7 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{selectedProspect.company_name}</h3>
                                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                                        <Building2 className="size-4" />{selectedProspect.industry}
                                        {selectedProspect.website && (
                                            <><span className="opacity-30">·</span><a href={selectedProspect.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1"><Globe className="size-3" />Website</a></>
                                        )}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedProspect(null)} className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="size-5" /></button>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                {selectedProspect.revenue_range && <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-300">{selectedProspect.revenue_range}</span>}
                                {selectedProspect.employee_count && <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-300">{selectedProspect.employee_count} employees</span>}
                                {selectedProspect.isAiSourced
                                    ? <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full flex items-center gap-1"><Sparkles className="size-3" />AI Sourced</span>
                                    : <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full">Strong Fit</span>
                                }
                            </div>

                            {/* AI Match Summary */}
                            {sum && (
                                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <h4 className="flex items-center gap-2 font-semibold text-indigo-400 mb-2 text-sm">
                                        <Zap className="size-4" /> AI Match Summary
                                    </h4>
                                    <p className="text-sm leading-relaxed text-white/80">{sum}</p>
                                </div>
                            )}

                            {/* Why strategy */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="flex items-center gap-2 font-semibold text-white/70 mb-2 text-sm"><TrendingUp className="size-4" />Win Strategy</h4>
                                <p className="text-sm leading-relaxed text-white/60">{selectedProspect.win_strategy || 'Fit based on ICP overlap'}</p>
                            </div>

                            {/* Description */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-semibold text-white/70 mb-2 text-sm">Company Overview</h4>
                                <p className="text-sm leading-relaxed text-white/60">{selectedProspect.desc}</p>
                            </div>

                            {selectedProspect.contact_email && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Contact</p>
                                    <a href={`mailto:${selectedProspect.contact_email}`} className="text-indigo-300 hover:text-white hover:underline text-sm">{selectedProspect.contact_email}</a>
                                </div>
                            )}

                            <div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedProspect(null)}>Close</Button></div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
