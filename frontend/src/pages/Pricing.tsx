import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui'
import { postJSON } from '../lib/api'
import { useStore } from '../lib/store'

export default function Pricing() {
  const nav = useNavigate()
  const { dealId, companyName, quoteItems, setQuoteItems, priced, setPriced } = useStore()
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  function inc(name: string) {
    setQuoteItems(quoteItems.map((x) => (x.product_name === name ? { ...x, qty: x.qty + 1 } : x)))
  }
  function dec(name: string) {
    setQuoteItems(quoteItems.map((x) => (x.product_name === name ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))
  }
  function del(name: string) {
    setQuoteItems(quoteItems.filter((x) => x.product_name !== name))
  }

  async function price() {
    try {
      setErr(null)
      setLoading(true)
      const res = await postJSON<any>('/api/quote/price', {
        deal_id: dealId,
        company_name: companyName,
        items: quoteItems,
      })
      setPriced(res.pricing)
    } catch (e: any) {
      setErr(e?.message || 'Pricing failed')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!priced && quoteItems.length) price()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // customDiscounts: product_name -> discount % as string (0-100)
  const [customDiscounts, setCustomDiscounts] = React.useState<Record<string, string>>({})

  // Seed custom discounts from server values when priced data arrives
  React.useEffect(() => {
    if (priced?.items) {
      setCustomDiscounts((prev) => {
        const next = { ...prev }
        for (const item of priced.items) {
          if (!(item.product_name in next)) {
            next[item.product_name] = item.discount
              ? String(Math.round(item.discount * 100))
              : '0'
          }
        }
        return next
      })
    }
  }, [priced])

  function getEffectiveDiscount(name: string, serverDisc: number): number {
    const raw = customDiscounts[name]
    if (raw === undefined || raw === '') return serverDisc
    const parsed = parseFloat(raw)
    return isNaN(parsed) ? serverDisc : Math.min(100, Math.max(0, parsed)) / 100
  }

  function computeLineTotal(unitPrice: any, qty: number, discount: number): string {
    if (unitPrice == null || unitPrice === '—') return '—'
    const unit = parseFloat(String(unitPrice).replace(/,/g, ''))
    if (isNaN(unit)) return '—'
    return (unit * qty * (1 - discount)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const computedSubtotal = React.useMemo(() => {
    if (!priced?.items) return null
    let total = 0
    for (const x of quoteItems) {
      const pricedItem = priced.items.find((p: any) => p.product_name === x.product_name)
      if (!pricedItem) continue
      const unit = parseFloat(String(pricedItem.unit_price ?? '').replace(/,/g, ''))
      if (isNaN(unit)) continue
      const disc = getEffectiveDiscount(x.product_name, pricedItem.discount ?? 0)
      total += unit * x.qty * (1 - disc)
    }
    return total.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteItems, priced, customDiscounts])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">Quotation</div>
          <div className="mt-1 text-sm text-text-secondary">Dynamic pricing with clean, readable line items.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => nav('/insights')}>
            View Insights
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-sm text-warning">{err}</div>
      )}

      <div className="relative">
        <Card title="Pricing">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-[12px] text-text-muted">
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit Price</th>
                  <th className="py-2">Discount %</th>
                  <th className="py-2">Actions</th>
                  <th className="py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quoteItems.map((x) => {
                  const pricedItem = priced?.items?.find((p: any) => p.product_name === x.product_name)
                  const unit = pricedItem?.unit_price ?? '—'
                  const serverDisc = pricedItem?.discount ?? 0
                  const effectiveDisc = getEffectiveDiscount(x.product_name, serverDisc)
                  const line = computeLineTotal(unit, x.qty, effectiveDisc)

                  return (
                    <tr key={x.product_name} className="align-middle">
                      <td className="py-3 pr-3">
                        <div className="font-semibold">{x.product_name}</div>
                      </td>
                      <td className="py-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => dec(x.product_name)}
                            className="h-8 w-8 rounded-[10px] border border-border hover:bg-gray-50"
                          >
                            &minus;
                          </button>
                          <span className="w-8 text-center font-semibold">{x.qty}</span>
                          <button
                            onClick={() => inc(x.product_name)}
                            className="h-8 w-8 rounded-[10px] border border-border hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge tone="brand">&#8377; {unit}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={
                              customDiscounts[x.product_name] !== undefined
                                ? customDiscounts[x.product_name]
                                : serverDisc
                                  ? String(Math.round(serverDisc * 100))
                                  : '0'
                            }
                            onChange={(e) =>
                              setCustomDiscounts((prev) => ({ ...prev, [x.product_name]: e.target.value }))
                            }
                            className="h-8 w-20 rounded-[10px] border border-border px-2 pr-6 text-sm outline-none focus:ring-2 focus:ring-brand-100 text-center"
                          />
                          <span className="absolute right-2 text-[12px] text-text-muted pointer-events-none">%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <button onClick={() => del(x.product_name)} className="rounded-[10px] border border-border px-2 py-1 hover:bg-gray-50">
                          🗑
                        </button>
                      </td>
                      <td className="py-3 text-right font-semibold">&#8377; {line}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="sticky bottom-4 ml-auto mt-4 w-full max-w-sm rounded-card border border-border bg-white p-4 shadow-card">
          <div className="text-[12px] font-semibold text-text-secondary">Total</div>
          <div className="mt-2 flex items-center justify-between text-sm text-text-secondary">
            <span>Subtotal (after discounts)</span>
            <span className="font-semibold">&#8377; {computedSubtotal ?? '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-text-secondary">
            <span>Taxes</span>
            <span className="font-semibold">&#8377; {priced?.taxes ?? '0'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-base border-t border-border pt-3">
            <span className="font-semibold">Grand Total</span>
            <span className="text-lg font-bold text-brand">
              &#8377; {computedSubtotal != null
                ? (parseFloat(String(computedSubtotal).replace(/,/g, '')) + (priced?.taxes ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                : '—'}
            </span>
          </div>
          <div className="mt-4">
            <Button onClick={() => alert('POC: Finalize Quote')}>Finalize Quote</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
