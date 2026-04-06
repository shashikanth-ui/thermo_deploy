// API_BASE falls back to empty string for local proxy, but uses env var in production
const API_BASE = import.meta.env.VITE_API_BASE || ''
// GRAPH_BASE falls back to localhost:3000, but uses env var in production
const GRAPH_BASE = import.meta.env.VITE_GRAPH_BASE || 'http://localhost:3000'

export async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Request failed')
  }
  return res.json() as Promise<T>
}

export async function uploadFile<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
  const fd = new FormData()
  fd.append('file', file)
  if (fields) {
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  }
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: fd })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Upload failed')
  }
  return res.json() as Promise<T>
}

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Request failed')
  }
  return res.json() as Promise<T>
}

export async function getGraphJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Graph Request failed')
  }
  return res.json() as Promise<T>
}

export async function postGraphJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Graph Request failed')
  }
  return res.json() as Promise<T>
}
