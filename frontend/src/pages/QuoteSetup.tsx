import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { getJSON, postJSON } from '../lib/api'
import { useStore } from '../lib/store'

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-[10px] px-2 py-1 text-sm text-text-secondary hover:bg-gray-50">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function QuoteSetup() {
  const nav = useNavigate()
  const { dealId, companyName, setCompanyName, quoteItems, setQuoteItems, setPriced } = useStore()
  const [newProd, setNewProd] = React.useState('')
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerData, setDrawerData] = React.useState<any | null>(null)
  const [drawerGraph, setDrawerGraph] = React.useState<any | null>(null)

  function remove(name: string) {
    setQuoteItems(quoteItems.filter((x) => x.product_name !== name))
  }

  function add() {
    const name = newProd.trim()
    if (!name) return
    if (quoteItems.some((x) => x.product_name.toLowerCase() === name.toLowerCase())) return
    setQuoteItems([...quoteItems, { product_name: name, qty: 1, unit_price: null }])
    setNewProd('')
  }

  async function view(name: string) {
    setDrawerGraph(null)
    // 1) Try graph intelligence (if enabled)
    try {
      const g = await getJSON<any>(`/api/graph/product?name=${encodeURIComponent(name)}`)
      setDrawerGraph(g)
    } catch {
      // ignore (graph disabled/unavailable)
    }

    // 2) Always load dataset detail as a fallback
    try {
      const p = await getJSON<any>(`/api/products/by-name?name=${encodeURIComponent(name)}`)
      setDrawerData(p)
      setDrawerOpen(true)
    } catch {
      setDrawerData({ thermo_product: name, competitive_analysis: null })
      setDrawerOpen(true)
    }
  }

  async function next() {
    setPriced(null)
    await postJSON('/api/quote/setup', {
      deal_id: dealId,
      company_name: companyName,
      products: quoteItems.map((x) => x.product_name),
    })
    nav('/pricing')
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Quote Setup</div>
        <div className="mt-1 text-sm text-text-secondary">Review and edit products before pricing.</div>
      </div>

      <Card title="New Deal">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-[12px] font-semibold text-text-secondary">Deal ID</div>
            <input
              value={dealId}
              readOnly
              className="mt-2 h-10 w-full rounded-[12px] border border-border bg-gray-50 px-3 text-sm text-text-secondary"
            />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-text-secondary">Company Name</div>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., NovaBio Labs"
              className="mt-2 h-10 w-full rounded-[12px] border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      </Card>

      <Card title="Recommended products (editable)">
        <div className="space-y-2">
          {quoteItems.map((x) => (
            <div key={x.product_name} className="flex items-center justify-between rounded-[12px] border border-border bg-white px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{x.product_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => remove(x.product_name)}
                  className="rounded-[10px] border border-border bg-white px-2 py-1 text-sm hover:bg-gray-50"
                  title="Remove"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          {quoteItems.length === 0 && <div className="text-sm text-text-muted">No products selected.</div>}

          <div className="mt-3 flex gap-2">
            <input
              value={newProd}
              onChange={(e) => setNewProd(e.target.value)}
              placeholder="Add product name…"
              className="h-10 flex-1 rounded-[12px] border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
            <Button variant="secondary" onClick={add}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end">
        <Button onClick={next} disabled={quoteItems.length === 0 || companyName.trim().length === 0}>
          Generate Quote ➜
        </Button>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerData?.thermo_product || 'Product'}>
        {drawerGraph && (
          <div className="mb-4 rounded-[12px] border border-border bg-gray-50 p-3">
            <div className="text-[12px] font-semibold text-text-secondary">GraphRAG intelligence</div>
            <div className="mt-1 text-sm font-semibold">{drawerGraph.product}</div>
            {drawerGraph.summary && <div className="mt-2 text-sm text-text-secondary">{drawerGraph.summary}</div>}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[12px] font-semibold text-text-secondary">Strengths</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  {(drawerGraph.strengths || []).slice(0, 6).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text-secondary">Weaknesses</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  {(drawerGraph.weaknesses || []).slice(0, 6).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {drawerGraph.competitors?.length > 0 && (
              <div className="mt-3">
                <div className="text-[12px] font-semibold text-text-secondary">Competitors in graph</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {drawerGraph.competitors.slice(0, 8).map((c: string) => (
                    <span key={c} className="rounded-[999px] border border-border bg-white px-2 py-1 text-xs text-text-secondary">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!drawerData?.competitive_analysis && (
          <div className="text-sm text-text-secondary">Product details not found in dataset. (Placeholder panel)</div>
        )}
        {drawerData?.competitive_analysis && (
          <div className="space-y-4">
            {(() => {
              const ca = Array.isArray(drawerData.competitive_analysis)
                ? drawerData.competitive_analysis[0]
                : drawerData.competitive_analysis
              if (!ca) return null
              const ts = ca.thermo_strengths
              const cs = ca.competitor_strengths
              const cc = ca.competitor_cons

              const flatten = (obj: any) => {
                if (!obj) return []
                if (Array.isArray(obj)) return obj
                return [
                  ...(obj.technical || []),
                  ...(obj.workflow || []),
                  ...(obj.commercial || [])
                ]
              }

              const thermoStrengths = flatten(ts)
              const competitorStrengths = flatten(cs)
              const competitorCons = flatten(cc)

              return (
                <>
                  <div>
                    <div className="text-[12px] font-semibold text-text-secondary">Comparative position</div>
                    <div className="mt-1 text-sm font-semibold">{ca.comparative_position}</div>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-text-secondary">Why buy (Thermo strengths)</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                      {thermoStrengths.slice(0, 6).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-text-secondary">Competitor comparison</div>
                    <div className="mt-2 rounded-[12px] border border-border bg-gray-50 p-3">
                      <div className="text-sm font-semibold">
                        {ca.competitor_company} — {ca.competitor_product}
                      </div>
                      <div className="mt-2 text-[12px] font-semibold text-text-secondary">Competitor strengths</div>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {competitorStrengths.slice(0, 4).map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <div className="mt-3 text-[12px] font-semibold text-text-secondary">Competitor weaknesses</div>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {competitorCons.slice(0, 4).map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </Drawer>
    </div>
  )
}
