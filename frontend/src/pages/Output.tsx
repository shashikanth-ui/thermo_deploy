import React from 'react'
import GraphModal from '../components/GraphModal'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Chip } from '../components/ui'
import { getJSON, postJSON, getGraphJSON, postGraphJSON } from '../lib/api'
import { useStore } from '../lib/store'

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg border-l border-border bg-white shadow-card animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-[10px] px-2 py-1 text-sm text-text-secondary hover:bg-gray-50">
            ✕
          </button>
        </div>
        <div className="h-[calc(100vh-60px)] overflow-y-auto p-5 custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}

function SummarySection({ title, content, icon }: { title: string; content: string; icon: React.ReactNode }) {
  if (!content || content.toLowerCase().includes('data is insufficient')) return null
  return (
    <div className="mb-4 rounded-xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
          {icon}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">{title}</div>
      </div>
      <div className="text-[13px] leading-relaxed text-text-primary font-medium">{content}</div>
    </div>
  )
}

export default function Output() {
  const nav = useNavigate()
  const { companyName, analysis, recommendations, setQuoteItems, setPriced } = useStore()
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerData, setDrawerData] = React.useState<any | null>(null)
  const [drawerGraph, setDrawerGraph] = React.useState<any | null>(null)
  const [graphData, setGraphData] = React.useState<any | null>(null)
  const [graphModalOpen, setGraphModalOpen] = React.useState(false)
  const [graphModalProduct, setGraphModalProduct] = React.useState('')
  const [graphLoading, setGraphLoading] = React.useState(false)

  const [drawerRagLoading, setDrawerRagLoading] = React.useState(false)
  const [ragQuery, setRagQuery] = React.useState('')
  const [ragThread, setRagThread] = React.useState<Array<{ q: string; a: string; error?: boolean }>>([])

  // AI-generated bullet summaries for strengths & improvement areas
  const [drawerSummary, setDrawerSummary] = React.useState<{
    strengths_summary: string[]
    improvements_summary: string[]
    source?: string
  } | null>(null)
  const [drawerSummaryLoading, setDrawerSummaryLoading] = React.useState(false)

  function startOver() {
    nav('/agent')
  }

  function generateQuote() {
    setPriced(null)
    const items = recommendations
      .filter((r) => r.match_score >= 65)
      .map((r) => ({ product_name: r.thermo_product, qty: 1, unit_price: null }))
    setQuoteItems(items)
    nav('/quote-setup')
  }

  async function viewProduct(name: string) {
    setDrawerGraph(null)
    setDrawerRagLoading(false)
    setRagQuery('')
    setRagThread([])
    setDrawerSummary(null)
    setDrawerSummaryLoading(true)
    setDrawerOpen(true)

    // Fire all three fetches in parallel
    const [graphResult, productResult, summaryResult] = await Promise.allSettled([
      // 1. Graph Intelligent Summary & Structured Data
      getGraphJSON<any>(`/api/product/${encodeURIComponent(name)}`),
      // 2. Product Data (local DB)
      getJSON<any>(`/api/products/by-name?name=${encodeURIComponent(name)}`),
      // 3. AI-generated strengths & improvements bullet summaries
      getJSON<any>(`/api/products/strengths-summary?name=${encodeURIComponent(name)}`),
    ])

    if (graphResult.status === 'fulfilled') setDrawerGraph(graphResult.value)
    setDrawerData(
      productResult.status === 'fulfilled'
        ? productResult.value
        : { thermo_product: name, competitive_analysis: null }
    )
    if (summaryResult.status === 'fulfilled') setDrawerSummary(summaryResult.value)
    setDrawerSummaryLoading(false)
  }

  async function openGraph(name: string) {
    setGraphModalProduct(name)
    setGraphData(null)
    setGraphLoading(true)
    setGraphModalOpen(true)
    try {
      const gd = await getGraphJSON<any>(`/api/product/${encodeURIComponent(name)}/graph`)
      setGraphData(gd)
    } catch {
      setGraphData(null)
    } finally {
      setGraphLoading(false)
    }
  }

  async function handleGraphQuery() {
    if (!ragQuery.trim() || drawerRagLoading) return
    const question = ragQuery.trim()
    setRagQuery('')
    setDrawerRagLoading(true)
    try {
      const res = await postGraphJSON<any>('/api/ask', {
        question: `For product ${drawerData?.thermo_product || drawerGraph?.product}: ${question}`
      })
      setRagThread(prev => [...prev, {
        q: question,
        a: res.answer || 'No response from the knowledge graph.',
      }])
    } catch (e: any) {
      setRagThread(prev => [...prev, {
        q: question,
        a: e.message || 'Graph query failed. Make sure the graph service is running.',
        error: true,
      }])
    } finally {
      setDrawerRagLoading(false)
    }
  }

  const parseSummary = (text: string) => {
    if (!text) return null;
    const parts = text.split(/\d\.\s\*\*.*?\*\*\s+/);
    // index 0 is empty usually, 1=usage, 2=advantages, 3=risks
    return {
      usage: parts[1]?.trim() || '',
      advantages: parts[2]?.trim() || '',
      risks: parts[3]?.trim() || '',
    };
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Sales Output</div>
        <div className="mt-1 text-sm text-text-secondary">Structured summary, requirements, and recommendations.</div>
      </div>

      <Card
        title="Account"
        right={
          <Badge tone={analysis?.company_exists ? 'success' : 'warning'}>
            {analysis?.company_exists ? 'Existing Customer' : 'New Customer'}
          </Badge>
        }
      >
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{analysis?.company_name || companyName || '—'}</span>
          {analysis?.company_exists && (
            <span className="ml-2 text-[12px] text-text-muted">(present in client list)</span>
          )}
        </div>
      </Card>

      <div className="grid gap-4">
        <Card title="Request Summary">
          <div className="text-sm text-text-secondary">{analysis?.summary || 'No summary yet. Go back and analyze requirements.'}</div>
        </Card>


        <Card title="Recommended Products">
          <div className="divide-y divide-border">
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <path d="M8 11h6M11 8v6" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-text-primary">No products matched your requirements</div>
                <div className="mt-1 max-w-xs text-[12px] text-text-muted">
                  Try refining your requirements with more specific application area, sample type, or technical specs to get relevant recommendations.
                </div>
              </div>
            ) : (
              recommendations.map((r) => {
                const isOpen = !!open[r.thermo_product]
                const score = Math.round(r.match_score)

                return (
                  <div key={r.thermo_product} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text-primary">{r.thermo_product}</div>
                        <div className="mt-1 text-[12px] text-text-muted">
                          Competitive position: <span className="font-semibold">{r.competitive_analysis?.comparative_position || 'Neutral'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openGraph(r.thermo_product)}
                          className="flex items-center gap-1 rounded-[10px] border border-brand/20 bg-brand/5 px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                          title="View Graph"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                          Graph
                        </button>
                        <button
                          onClick={() => viewProduct(r.thermo_product)}
                          className="rounded-[10px] border border-border bg-white px-2 py-1 text-sm hover:bg-gray-50"
                          title="View details"
                        >
                          View
                        </button>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${score >= 70
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : score >= 40
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                        >
                          {score}% matched
                        </span>
                        <button
                          onClick={() => setOpen((p) => ({ ...p, [r.thermo_product]: !isOpen }))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-[12px] border border-border bg-white text-text-secondary hover:bg-gray-50"
                          aria-label="Toggle details"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className={`transition ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 rounded-[12px] border border-border bg-gray-50 p-3">
                        <div className="text-[13px] font-semibold text-text-primary">Why this matched</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-text-secondary">
                          {(r.explainability?.why_matched || []).length > 0 ? (
                            (r.explainability.why_matched).slice(0, 6).map((x: string, i: number) => (
                              <li key={i}>{x}</li>
                            ))
                          ) : (
                            <li className="list-none text-text-muted italic">No specific match reasons available.</li>
                          )}
                        </ul>

                        {(r.explainability?.evidence || []).length > 0 && (
                          <>
                            <div className="mt-3 text-[13px] font-semibold text-text-primary">Evidence</div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-text-secondary">
                              {(r.explainability.evidence).slice(0, 5).map((x: string, i: number) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={startOver}>
          Start Over
        </Button>
        <Button onClick={generateQuote} disabled={recommendations.length === 0}>
          Continue to Quote
        </Button>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerData?.thermo_product || drawerGraph?.product || 'Product'}>
        <div className="overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
          {/* Graph RAG Section */}
          <div className="mb-6 rounded-[16px] border-2 border-brand/20 bg-brand/5 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/5 blur-3xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 12h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Intelligence Summary</h3>
                <p className="text-[12px] font-medium text-brand/80 uppercase tracking-widest">Grounding: {drawerGraph?.source || 'Graph Knowledge Base'}</p>
              </div>
            </div>

            {drawerGraph?.summary ? (
              <div className="mb-4 space-y-3">
                {(() => {
                  const s = parseSummary(drawerGraph.summary)
                  if (!s) return null
                  return (
                    <>
                      <SummarySection
                        title="Primary Use Case"
                        content={s.usage}
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>}
                      />
                      <SummarySection
                        title="Competitive Advantages"
                        content={s.advantages}
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>}
                      />
                      <SummarySection
                        title="Risk Areas / Lost Deals"
                        content={s.risks}
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>}
                      />
                    </>
                  )
                })()}
              </div>
            ) : (
              <div className="mb-4 text-sm text-text-muted italic bg-white/30 rounded-lg p-3">
                Generating strategic summary...
              </div>
            )}

            <div className="rounded-xl border border-brand/10 bg-white/70 backdrop-blur-md p-4 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <div className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Probe Graph Knowledge Base</div>
              </div>

              {/* Chat thread */}
              {ragThread.length > 0 && (
                <div className="mb-3 space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {ragThread.map((entry, i) => (
                    <div key={i} className="space-y-1.5">
                      {/* Question bubble */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-3 py-2 text-[12px] text-white font-medium shadow-sm">
                          {entry.q}
                        </div>
                      </div>
                      {/* Answer bubble */}
                      <div className="flex justify-start">
                        <div className={`max-w-[92%] rounded-2xl rounded-tl-sm px-3 py-2.5 text-[12px] leading-relaxed shadow-sm ${entry.error
                          ? 'bg-red-50 border border-red-100 text-red-700'
                          : 'bg-gray-50 border border-border text-text-primary'
                          }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-brand">Graph Knowledge</span>
                          </div>
                          {entry.a}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Loading bubble */}
                  {drawerRagLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-tl-sm bg-gray-50 border border-border px-4 py-3 text-[12px] text-text-muted flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input row */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Ask about competitor overlaps, site compatibility..."
                  className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 shadow-sm placeholder:text-text-muted"
                  onKeyDown={(e) => e.key === 'Enter' && !drawerRagLoading && handleGraphQuery()}
                  disabled={drawerRagLoading}
                />
                <button
                  onClick={handleGraphQuery}
                  disabled={drawerRagLoading || !ragQuery.trim()}
                  className="flex-shrink-0 rounded-xl bg-brand px-4 py-2 text-[13px] font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 shadow-md flex items-center gap-1.5"
                >
                  {drawerRagLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Strengths & Improvement Areas — AI-summarized bullet points */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            {/* Market Strengths */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Market Strengths</div>
              </div>
              {drawerSummaryLoading ? (
                <div className="space-y-2">
                  {[80, 65, 90].map((w, i) => (
                    <div key={i} className="h-3 rounded-full bg-emerald-200/70 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : drawerSummary?.strengths_summary?.length ? (
                <ul className="space-y-2">
                  {drawerSummary.strengths_summary.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-emerald-900">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(drawerGraph?.strengths || []).map((s: string) => <Badge key={s} tone="success">{s}</Badge>)}
                </div>
              )}
            </div>

            {/* Improvement Areas */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Improvement Areas</div>
              </div>
              {drawerSummaryLoading ? (
                <div className="space-y-2">
                  {[75, 90, 60].map((w, i) => (
                    <div key={i} className="h-3 rounded-full bg-amber-200/70 animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : drawerSummary?.improvements_summary?.length ? (
                <ul className="space-y-2">
                  {drawerSummary.improvements_summary.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-900">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(drawerGraph?.weaknesses || []).map((w: string) => <Badge key={w} tone="warning">{w}</Badge>)}
                </div>
              )}
            </div>
          </div>

          {/* Decision Drivers & Customers */}
          {(drawerGraph?.decisionDrivers?.length > 0 || drawerGraph?.customers?.length > 0) && (
            <div className="mb-6 space-y-4">
              {drawerGraph?.decisionDrivers?.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-[12px] font-bold text-text-muted uppercase tracking-wider">Key Decision Drivers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerGraph.decisionDrivers.map((d: string) => <Badge key={d} tone="brand">{d}</Badge>)}
                  </div>
                </div>
              )}
              {drawerGraph?.customers?.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-[12px] font-bold text-text-muted uppercase tracking-wider">Reference Customers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerGraph.customers.map((c: string) => <Badge key={c} tone="success">{c}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Competitive Analysis from Local DB */}
          {drawerData?.competitive_analysis && (
            <div className="space-y-6">
              {(() => {
                const ca = Array.isArray(drawerData.competitive_analysis) ? drawerData.competitive_analysis[0] : drawerData.competitive_analysis
                if (!ca) return null
                return (
                  <>
                    <div className="border-b border-border pb-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Market Positioning</div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-lg font-bold text-text-primary">{ca.comparative_position}</div>
                        <Badge tone="brand">Competitive Match</Badge>
                      </div>
                    </div>
                    {ca.net_assessment_summary && (
                      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-brand">Strategic Net Assessment</div>
                        <p className="mt-2 text-sm leading-relaxed text-text-primary italic">"{ca.net_assessment_summary}"</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Advisory Verdict */}
          <div className="mt-8 rounded-[16px] border-2 border-brand/20 bg-gradient-to-br from-brand/5 to-transparent p-6 text-center">
            <div className="text-[12px] font-bold uppercase tracking-widest text-brand">AI Advisory Verdict</div>
            <div className="mt-2 text-3xl font-extrabold text-brand">
              {Number(drawerData?.match_score || 0) >= 85 ? 'Strong Buy' : Number(drawerData?.match_score || 0) >= 70 ? 'Recommended' : 'Evaluate Further'}
            </div>
          </div>
        </div>
      </Drawer>

      <GraphModal
        open={graphModalOpen}
        onClose={() => setGraphModalOpen(false)}
        productName={graphModalProduct}
        graphData={graphData}
        loading={graphLoading}
      />
    </div>
  )
}
