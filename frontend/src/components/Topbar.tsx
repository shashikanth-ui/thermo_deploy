import { Link, useLocation } from 'react-router-dom'

export default function Topbar() {
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img
            src="/thermofisher-logo.png"
            alt="ThermoFisher Scientific"
            className="h-8 w-auto object-contain"
          />
        </Link>
      </div>
    </div>
  )
}
