import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { postJSON, uploadFile } from '../lib/api'
import { useStore } from '../lib/store'

export default function Agent() {
  const nav = useNavigate()
  const { companyName, setCompanyName, requirementsText, setRequirementsText, setAnalysis, setRecommendations, setDealId } = useStore()
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function analyze() {
    try {
      setErr(null)
      setLoading(true)

      let analysis
      if (file) {
        analysis = await uploadFile<any>('/api/analyze-upload', file, {
          company_name: companyName,
          requirements_text: requirementsText,
        })
      } else {
        analysis = await postJSON<any>('/api/analyze', { company_name: companyName, requirements_text: requirementsText })
      }

      setAnalysis(analysis)
      if (analysis?.deal_id) {
        setDealId(analysis.deal_id)
      }

      const rec = await postJSON<any>('/api/recommend', {
        requirements_text: requirementsText || (analysis?.summary ?? ''),
        tags: analysis?.tags ?? [],
      })
      setRecommendations(rec.recommended_products || [])

      nav('/output')
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Sales Agent</div>
        <div className="mt-1 text-sm text-text-secondary">Enter account details, attach files, and submit to the agent.</div>
      </div>

      {err && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-sm text-warning">{err}</div>
      )}

      <Card title="Requirement Intake">
        <div className="grid gap-4">
          <div>
            <label className="text-[12px] font-semibold text-text-secondary">Company Name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., GenomeWorks"
              className="mt-2 h-10 w-full rounded-[12px] border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-text-secondary">Customer Requirements</label>
            <textarea
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder="Enter customer needs, constraints, budget range, timeline, application area, required specs…"
              className="mt-2 h-[220px] w-full resize-none rounded-[12px] border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-2 text-[12px] text-text-muted">Tip: Include application, sample type, throughput, and any regulatory constraints.</div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-text-secondary">Upload Files (optional)</label>
            <div
              className="mt-2 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-gray-50 p-4 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) setFile(f)
              }}
            >
              <div className="text-sm font-semibold">Drag & drop PDF/DOCX/TXT</div>
              <div className="mt-1 text-[12px] text-text-muted">Drop files here or browse</div>
              <input
                className="mt-4 text-sm"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <div className="mt-4 rounded-[12px] border border-border bg-white px-3 py-2 text-[12px] text-text-secondary">
                  Selected: <span className="font-semibold">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button
              onClick={analyze}
              loading={loading}
              disabled={!companyName.trim() || (!file && requirementsText.trim().length < 10)}
            >
              {loading ? 'Submitting to Agent…' : 'Submit'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
