import React from 'react'

export type Analysis = {
  company_name?: string
  company_exists?: boolean
  summary: string
  tags: string[]
  constraints: Record<string, string>
  budget?: string | null
  timeline?: string | null
  application?: string | null
  deal_id?: string | null
}

export type RecommendationItem = {
  thermo_product: string
  match_score: number
  competitive_analysis: any
  explainability: {
    why_matched: string[]
    evidence: string[]
    confidence: number
  }
}

export type QuoteItem = {
  product_name: string
  qty: number
  unit_price: number | null
}

type Store = {
  requirementsText: string
  setRequirementsText: (v: string) => void
  analysis: Analysis | null
  setAnalysis: (v: Analysis | null) => void
  recommendations: RecommendationItem[]
  setRecommendations: (v: RecommendationItem[]) => void
  dealId: string
  setDealId: (v: string) => void
  companyName: string
  setCompanyName: (v: string) => void
  quoteItems: QuoteItem[]
  setQuoteItems: (v: QuoteItem[]) => void
  priced: any | null
  setPriced: (v: any | null) => void
}

const Ctx = React.createContext<Store | null>(null)

function makeDealId() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `DL-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(Math.random() * 9000 + 1000)}`
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [requirementsText, setRequirementsText] = React.useState('')
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null)
  const [recommendations, setRecommendations] = React.useState<RecommendationItem[]>([])
  const [dealId, setDealId] = React.useState(makeDealId())
  const [companyName, setCompanyName] = React.useState('')
  const [quoteItems, setQuoteItems] = React.useState<QuoteItem[]>([])
  const [priced, setPriced] = React.useState<any | null>(null)

  return (
    <Ctx.Provider
      value={{
        requirementsText,
        setRequirementsText,
        analysis,
        setAnalysis,
        recommendations,
        setRecommendations,
        dealId,
        setDealId,
        companyName,
        setCompanyName,
        quoteItems,
        setQuoteItems,
        priced,
        setPriced,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx
}
