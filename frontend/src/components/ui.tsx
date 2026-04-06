import React from 'react'

export function Card({ title, right, children, className = '' }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-border bg-white shadow-card ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-[15px] font-semibold text-text-primary">{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  loading,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[12px] px-4 h-10 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed'

  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:brightness-95'
      : variant === 'secondary'
        ? 'border border-brand-600 text-brand-600 hover:bg-brand-50'
        : 'text-brand-600 hover:bg-brand-50'

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${styles}`}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
      )}
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'brand',
}: {
  children: React.ReactNode
  tone?: 'brand' | 'success' | 'warning' | 'neutral'
}) {
  const cls =
    tone === 'success'
      ? 'bg-emerald-50 text-success border-emerald-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-warning border-amber-100'
        : tone === 'neutral'
          ? 'bg-gray-50 text-text-secondary border-gray-100'
          : 'bg-brand-50 text-brand-600 border-brand-100'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold ${cls}`}>
      {children}
    </span>
  )
}

export function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[12px] text-text-secondary">
      {label}
    </span>
  )
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-left text-[12px] font-semibold text-text-secondary hover:text-text-primary"
      >
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-white transition ${open ? 'rotate-180' : ''
            }`}
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {title}
      </button>
      {open && <div className="mt-2 rounded-[12px] border border-border bg-gray-50 p-3 text-[13px] text-text-secondary">{children}</div>}
    </div>
  )
}
