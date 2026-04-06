'use client'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Globe, TrendingUp, Users, Target, Activity, Zap } from 'lucide-react'
import { NetworkGraph } from '@/components/network-graph'

interface LeadDetailsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead: any // Using any for flexibility with raw_data
}

export function LeadDetailsSheet({ open, onOpenChange, lead }: LeadDetailsProps) {
    if (!lead) return null

    // Extract analysis from raw_data if available, otherwise fallback
    const analysis = lead.raw_data || {}
    const score = lead.score || analysis.fit_score || 0

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-none overflow-y-auto bg-black/95 border-l border-white/10 text-foreground backdrop-blur-xl">
                <SheetHeader className="mb-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                {lead.company_name}
                                <a href={lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : '#'}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors">
                                    <Globe className="size-4" />
                                </a>
                            </SheetTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="size-3" />
                                {analysis.industry || 'Industry N/A'} • {analysis.employee_count_estimate || 'Size N/A'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{score}%</div>
                            <div className="text-xs text-muted-foreground">ICP Fit Score</div>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="analysis">Knowledge Graph</TabsTrigger>
                        <TabsTrigger value="signals">Signals & Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* Score Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Match Confidence</span>
                                <span>{analysis.fit_reason ? 'AI Reason Ready' : 'Calculated'}</span>
                            </div>
                            <Progress value={score} className="h-2 bg-white/10" />
                        </div>

                        {/* Executive Summary */}
                        {/* Executive Summary */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                                <Activity className="size-4" />
                                Executive Summary
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {analysis.executive_summary || lead.description || "Deep analysis in progress..."}
                            </p>
                        </div>

                        {/* Funnel & Deal Intelligence */}
                        {(analysis.funnel_stage || (analysis.decision_maker && analysis.decision_maker.name)) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {analysis.funnel_stage && (
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <div className="text-xs font-semibold uppercase text-blue-400 mb-1">Deal Status</div>
                                        <div className="font-bold text-lg">{analysis.funnel_stage}</div>
                                        <div className="text-sm text-muted-foreground">{analysis.deal_value || 'Value TBD'}</div>
                                    </div>
                                )}
                                {analysis.decision_maker && analysis.decision_maker.name && (
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <div className="text-xs font-semibold uppercase text-purple-400 mb-1">Decision Maker</div>
                                        <div className="font-bold text-lg">{analysis.decision_maker.name}</div>
                                        <div className="text-sm text-muted-foreground">{analysis.decision_maker.designation}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recommended Action (Moved to Overview for Speed) */}
                        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                            <h4 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                                <Zap className="size-4" />
                                Recommended Outreach Strategy
                            </h4>
                            <p className="text-sm font-mono text-indigo-100/80 bg-black/40 p-3 rounded-lg border border-white/10 italic">
                                "{analysis.recommended_outreach || "Analysis in progress..."}"
                            </p>
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={() => {
                                        if (analysis.recommended_outreach) {
                                            navigator.clipboard.writeText(analysis.recommended_outreach)
                                            alert("Copied to clipboard!")
                                        }
                                    }}
                                    className="text-xs flex items-center gap-1 font-medium text-indigo-400 hover:text-white transition-colors border border-indigo-500/30 rounded px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/30"
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                        </div>

                        {/* Tech Stack */}
                        {analysis.tech_stack_detected && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">Tech Stack Detected</h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.tech_stack_detected.map((tech: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                                            {tech}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <NetworkGraph
                            companyName={lead.company_name}
                            score={score}
                            lookalikes={analysis.look_alikes || analysis.competitors_lookalikes || []}
                            signals={analysis.buying_signals || lead.signals || []}
                        />
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-green-900/10 border border-green-500/20 space-y-2">
                                <h4 className="font-semibold text-green-400 flex items-center gap-2">
                                    <Target className="size-4" />
                                    Why it fits
                                </h4>
                                <p className="text-sm text-green-200/80">{analysis.fit_reason || "Fits target criteria based on preliminary scans."}</p>
                            </div>

                            {analysis.look_alikes && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-muted-foreground">Similar Companies (Look-alikes)</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {analysis.competitors_lookalikes?.map((co: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-sm">
                                                <Building2 className="size-3 opacity-50" />
                                                {co}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="signals" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* Buying Signals */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="size-4" />
                                Detected Buying Signals
                            </h4>
                            <div className="space-y-2">
                                {(analysis.buying_signals || lead.signals)?.map((signal: string, i: number) => (
                                    <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/5 border border-white/5">
                                        <div className="size-1.5 mt-1.5 rounded-full bg-purple-500 shrink-0" />
                                        <span className="text-sm">{signal}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommended Action */}

                    </TabsContent>
                </Tabs>

            </SheetContent>
        </Sheet>
    )
}
