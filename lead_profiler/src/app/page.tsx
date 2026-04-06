'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { LeadDetailsSheet } from '@/components/lead-details-sheet'
import { AgentTerminal } from '@/components/agent-terminal'

interface Lead {
  id: number
  company_name: string
  website: string
  description: string
  signals: string[]
  contact_email: string | null
  score: number
  raw_data?: any
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, qualified: 0, avgScore: 0 })
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const loadLeads = async (fromAgent = false) => {
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      if (Array.isArray(data)) {
        setLeads(data)
        updateStats(data)
        if (fromAgent) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 5000)
        }
      }
    } catch (e) { console.error(e) }
  }

  const updateStats = (data: Lead[]) => {
    const qualified = data.filter(l => l.score >= 80).length
    const avg = data.length ? Math.round(data.reduce((acc, curr) => acc + curr.score, 0) / data.length) : 0
    setStats({ total: data.length, qualified, avgScore: avg })
  }

  const enrichLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/enrich', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLeads(data.top20)
        updateStats(data.top20)
        // alert(`Enriched ${data.count} companies!`) 
      } else {
        alert('Enrichment failed: ' + (data.error || 'Unknown error'))
      }
    } catch (e) { alert("Network error") }
    setLoading(false)
  }

  const exportCsv = () => {
    const headers = [
      'Score', 'Company', 'Website', 'Funnel Stage', 'Deal Value',
      'Decision Maker', 'Outreach Draft', 'Signals', 'Lookalikes', 'Description'
    ]

    const rows = leads.map(l => {
      const rd = l.raw_data || {}
      const dm = rd.decision_maker?.name ? `${rd.decision_maker.name} (${rd.decision_maker.designation || ''})` : ''

      return [
        l.score,
        `"${l.company_name.replace(/"/g, '""')}"`,
        l.website || '',
        rd.funnel_stage || '',
        rd.deal_value || '',
        `"${dm.replace(/"/g, '""')}"`,
        `"${(rd.recommended_outreach || '').replace(/"/g, '""')}"`,
        `"${(l.signals || []).join('; ')}"`,
        `"${(rd.look_alikes || []).join('; ')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enriched-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  useEffect(() => {
    loadLeads()
  }, [])

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* ThermoFisher Logo - white bg pill so both red and black text are visible */}
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-3 py-1.5">
              <img
                src="/thermofisher-logo.png"
                alt="ThermoFisher Scientific"
                className="h-7 w-auto object-contain"
              />
            </div>
          </div>
          {/* Empty right side */}
          <div />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">





        {showSuccess && (
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5" />
              <span className="font-medium">Pipeline Refresh Complete! New high-fit prospects have been identified and scored.</span>
            </div>
            <button onClick={() => setShowSuccess(false)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Section Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Automate CRM Data Sync</h1>
          <p className="text-muted-foreground mt-1">Run the autonomous agent to enrich, score, and sync your sales pipeline in real time.</p>
        </div>

        {/* Agent Terminal */}
        <AgentTerminal onComplete={() => loadLeads(true)} />

        {/* CRM Intelligence Button — big and prominent */}
        <div className="flex justify-center">
          <button
            onClick={() => window.location.href = '/crm-intelligence'}
            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <TrendingUp className="size-5" />
            Ideal Customers
          </button>
        </div>


        <LeadDetailsSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} lead={selectedLead} />
      </main>
    </div>
  )
}
