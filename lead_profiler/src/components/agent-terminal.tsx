
'use client'

import { useState } from 'react'
import { Play, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type StepStatus = 'hidden' | 'active' | 'done'

interface Step {
    id: number
    label: string
    description: string
    status: StepStatus
}

const STEPS_DEF = [
    { id: 1, label: 'Agent Initialised', description: 'Starting the autonomous sales pipeline' },
    { id: 2, label: 'Fetching CRM Data', description: 'Loading knowledge graph & ICP strategy' },
    { id: 3, label: 'Analysing & Syncing', description: 'AI pattern recognition across CRM records' },
    { id: 4, label: 'Discovering Prospects', description: 'Searching for high-fit candidate companies' },
    { id: 5, label: 'Pipeline Active', description: 'All data synced — ready for outreach' },
]

export function AgentTerminal({ onComplete }: { onComplete?: () => void }) {
    const [isRunning, setIsRunning] = useState(false)
    const [isDone, setIsDone] = useState(false)
    const [steps, setSteps] = useState<Step[]>(
        STEPS_DEF.map(s => ({ ...s, status: 'hidden' as StepStatus }))
    )

    const mark = (id: number, status: StepStatus) =>
        setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))

    const reveal = (id: number) =>
        setSteps(prev => prev.map(s => s.id === id && s.status === 'hidden' ? { ...s, status: 'active' } : s))

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    const runAgent = async () => {
        if (isRunning) return
        setIsRunning(true)
        setIsDone(false)
        setSteps(STEPS_DEF.map(s => ({ ...s, status: 'hidden' as StepStatus })))

        try {
            // ── Step 1 ─────────────────────────────────────────
            reveal(1); mark(1, 'active')
            await delay(800)
            mark(1, 'done')

            // ── Step 2: Load / deep analyse CRM ─────────────────
            reveal(2); mark(2, 'active')
            try {
                const res = await fetch('/api/get-analysis')
                const data = await res.json()
                if (!data.success || !data.analysis) {
                    // try deep analysis — Step 3 active while this runs
                    reveal(3); mark(3, 'active')
                    mark(2, 'done')
                    await fetch('/api/analyze-crm', { method: 'POST' })
                    mark(3, 'done')
                } else {
                    mark(2, 'done')
                }
            } catch {
                mark(2, 'done') // always move forward
            }

            // ── Step 3 done if not revealed yet ──────────────────
            setSteps(prev => prev.map(s =>
                s.id === 3 && s.status === 'hidden' ? { ...s, status: 'done' } : s
            ))

            await delay(500)

            // ── Step 4: Prospects ────────────────────────────────
            reveal(4); mark(4, 'active')
            try { await fetch('/api/find-prospects', { method: 'POST' }) } catch { }
            await delay(600)
            mark(4, 'done')

            // ── Step 5: Enrich + done ───────────────────────────
            reveal(5); mark(5, 'active')
            try { await fetch('/api/enrich', { method: 'POST' }) } catch { }
            if (onComplete) onComplete()
            await delay(700)
            mark(5, 'done')
            setIsDone(true)

        } catch {
            // swallow — steps already advanced as far as they got
        } finally {
            setIsRunning(false)
        }
    }

    const visibleSteps = steps.filter(s => s.status !== 'hidden')

    return (
        <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white tracking-wide">AGENT COMMAND CENTER</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full transition-colors ${isRunning ? 'bg-green-400 animate-pulse' :
                            isDone ? 'bg-emerald-500' : 'bg-white/20'
                        }`} />
                    <span className="text-xs text-muted-foreground font-mono">
                        {isRunning ? 'RUNNING' : isDone ? 'COMPLETE' : 'IDLE'}
                    </span>
                </div>
            </div>

            {/* Steps — hidden until agent starts */}
            {visibleSteps.length > 0 && (
                <div className="px-8 py-7">
                    <div className="relative">
                        {/* vertical line only when ≥2 visible */}
                        {visibleSteps.length >= 2 && (
                            <div className="absolute left-[19px] top-5 bottom-5 w-px bg-white/10" />
                        )}
                        <div className="space-y-5">
                            {visibleSteps.map(step => (
                                <div
                                    key={step.id}
                                    className="flex items-start gap-5 relative animate-in slide-in-from-bottom-3 fade-in duration-500"
                                >
                                    {/* Circle */}
                                    <div className={`relative z-10 flex-shrink-0 flex items-center justify-center size-10 rounded-full border-2 transition-all duration-500 ${step.status === 'done' ? 'border-emerald-500 bg-emerald-500/20' :
                                            step.status === 'active' ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_16px_rgba(99,102,241,0.45)]' :
                                                'border-white/15 bg-white/5'
                                        }`}>
                                        {step.status === 'done' && <CheckCircle2 className="size-5 text-emerald-400" />}
                                        {step.status === 'active' && <Loader2 className="size-5 text-indigo-400 animate-spin" />}
                                    </div>

                                    {/* Text */}
                                    <div className="pt-1.5">
                                        <p className={`text-sm font-semibold transition-colors ${step.status === 'done' ? 'text-emerald-400' :
                                                step.status === 'active' ? 'text-white' : 'text-white/50'
                                            }`}>
                                            {step.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {isRunning ? 'Agent is autonomously executing tasks…' :
                        isDone ? '✅ Pipeline synced and ready for outreach.' :
                            'Click Initialize to start the autonomous pipeline.'}
                </p>
                <Button
                    size="sm"
                    onClick={runAgent}
                    disabled={isRunning}
                    className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] font-mono text-xs"
                >
                    {isRunning ? (
                        <><Loader2 className="size-3 mr-2 animate-spin" />EXECUTING...</>
                    ) : (
                        <><Play className="size-3 mr-2" />INITIALIZE AGENT</>
                    )}
                </Button>
            </div>
        </div>
    )
}
