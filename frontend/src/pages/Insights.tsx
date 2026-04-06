import React from 'react'
import { Accordion, Badge, Card } from '../components/ui'
import { postJSON } from '../lib/api'
import { useStore } from '../lib/store'

export default function Insights() {
  const { recommendations, quoteItems } = useStore()
  const [data, setData] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    ; (async () => {
      try {
        setErr(null)
        setLoading(true)

        // Build the selected product list: prefer quoteItems first,
        // fall back to all recommendations if nothing is in the cart yet.
        const cartNames = new Set(quoteItems.map((q) => q.product_name))
        const source = cartNames.size > 0
          ? recommendations.filter((r) => cartNames.has(r.thermo_product))
          : recommendations

        const selected = source.map((r) => ({
          thermo_product: r.thermo_product,
          competitive_analysis: r.competitive_analysis,
        }))

        const res = await postJSON<any>('/api/insights', { selected_products: selected })
        setData(res)
      } catch (e: any) {
        setErr(e?.message || 'Failed to load insights')
      } finally {
        setLoading(false)
      }
    })()
  }, [recommendations, quoteItems])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Insights</div>
        <div className="mt-1 text-sm text-text-secondary">Market competition and recommendation confidence.</div>
      </div>

      {err && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-sm text-warning">{err}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Win Rate">
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <div className="text-3xl font-bold">{data?.win_rate ?? '—'}%</div>
          )}
          <Accordion title="How it's calculated">
            This is our estimated chance of winning the deal. It shows how likely the customer is to choose us over someone else.
          </Accordion>
        </Card>

        <Card title="Recommendation Confidence">
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <div className="text-3xl font-bold">{data?.recommendation_confidence ?? '—'}%</div>
          )}
          <Accordion title="How it's calculated">
            This shows how sure the AI is about these suggestions. A high score means these products perfectly match what the customer asked for.
          </Accordion>
        </Card>
      </div> 

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Psychology AI Sales Advisor */}
        <div className="rounded-card border-2 border-brand/20 bg-brand/5 p-6 shadow-sm overflow-hidden relative">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/5 blur-2xl" />
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight"> AI Sales Buddy</h3>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/60" />
                ))}
              </div>
            ) : (data?.psychology_advice || []).length > 0 ? (
              data.psychology_advice.map((item: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 rounded-xl border border-brand/10 bg-white/70 p-4 backdrop-blur-sm shadow-sm transition hover:scale-[1.01]">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-bold leading-tight text-text-primary">{item}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-text-muted italic py-4">
                <span className="h-2 w-2 rounded-full bg-border animate-pulse" />
                No strategic items available for selected products.
              </div>
            )}
          </div>
        </div>

        {/* Discount Advice */}
        <div className="rounded-card border-2 border-brand/10 bg-brand/5 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Discount Agent</h3>
            {!loading && data?.discount_advice?.should_discount !== undefined && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${data.discount_advice.should_discount
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-text-muted'
                  }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${data.discount_advice.should_discount ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                />
                {data.discount_advice.should_discount ? 'Discount Recommended' : 'No Discount Needed'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-white/60" />
              <div className="h-24 animate-pulse rounded-xl bg-white/60" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white p-5 shadow-inner">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[14px]">
                  <span className="font-bold text-text-secondary">Should Discount:</span>
                  <span className={data?.discount_advice?.should_discount ? 'text-emerald-600 font-bold' : 'text-text-muted font-bold'}>
                    {data?.discount_advice?.should_discount ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[14px]">
                  <span className="font-bold text-text-secondary">Suggested Range:</span>
                  <span className="font-bold text-text-primary text-base">{data?.discount_advice?.range || '—'}</span>
                </div>
                <div className="rounded-lg border border-border bg-gray-50/80 p-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">Reasoning</span>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-primary">
                    {data?.discount_advice?.reason || 'No reasoning available.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="brand">Strategic Pricing</Badge>
            <Badge tone="success">Win Differentiation</Badge>
            <Badge tone="warning">Competitive Guardrails</Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-card border border-border bg-gray-50 p-4 text-sm text-text-secondary">
        Tip: keep insights lightweight. Use the advisory agent's strategic briefings to guide your negotiation strategy. ✨
      </div>
    </div>
  )
}
