import React from 'react'
import { Card, Button } from '../components/ui'

export default function Clients() {
    const [loading, setLoading] = React.useState(false)
    const [logs, setLogs] = React.useState<string[]>([])
    const [showLogs, setShowLogs] = React.useState(false)

    const runPipeline = async () => {
        try {
            setLoading(true)
            setLogs([])
            setShowLogs(true)

            const response = await fetch(`/api/execute-devv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })

            const data = await response.json()

            // Show each stdout line
            if (data.logs && data.logs.length > 0) {
                setLogs(data.logs)
            }

            if (data.status === 'success') {
                setLogs(prev => [...prev, `✅ ${data.message}`])
            } else if (data.status === 'error') {
                setLogs(prev => [
                    ...prev,
                    `🔴 Error: ${data.message}`,
                    ...(data.detail ? [`   ${data.detail.split('\n').slice(-3).join(' | ')}`] : []),
                ])
            }
        } catch (err: any) {
            const msg = err.message || 'Unknown error'
            setLogs([`🔴 Connection Error: ${msg}`, `ℹ️ Make sure the backend is running on port 8000`])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Clients & CRM Intelligence</h1>
                    <p className="mt-1 text-text-secondary">Syncing ThermoFisher records with deep AI profiling.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => window.open('http://localhost:4000', '_blank')}>
                        Open Devv Portal
                    </Button>
                    <Button onClick={runPipeline} disabled={loading}>
                        {loading ? 'Processing...' : 'Run Analysis Pipeline'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card title="Portal Integration">
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            The Devv Project is an external intelligence suite that provides deep company lookalikes, decision maker profiling, and buying signal analysis.
                        </p>
                        <div className="rounded-xl bg-brand/5 p-4 border border-brand/10">
                            <div className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Technical Status</div>
                            <div className="flex items-center gap-2 text-sm text-text-primary">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Integrated Bridge Active
                            </div>
                        </div>
                        <Button onClick={() => window.open('http://localhost:4000', '_blank')}>
                            Launch LeadProfiler UI →
                        </Button>
                    </div>
                </Card>

                <Card title="Quick Sync">
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            Execute the backend devv script to update local CRM records and refresh lead scores.
                        </p>
                        <Button variant="secondary" onClick={runPipeline} disabled={loading}>
                            Run Sync Process
                        </Button>
                    </div>
                </Card>
            </div>

            {showLogs && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="overflow-hidden rounded-xl border border-border bg-[#0D1117] shadow-2xl">
                        <div className="flex items-center justify-between bg-white/5 px-4 py-2 border-b border-white/10">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-[#FF5F56]" />
                                <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                                <div className="h-3 w-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Pipeline Log</div>
                        </div>
                        <div className="p-6 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                            {logs.length === 0 && <div className="text-white/30 italic">Initializing bridge...</div>}
                            {logs.map((log, i) => (
                                <div key={i} className="text-[#E6EDF3]">
                                    <span className="mr-3 text-white/20 select-none">{i + 1}</span>
                                    {log}
                                </div>
                            ))}
                            {loading && <div className="mt-2 h-4 w-1 animate-pulse bg-brand" />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
