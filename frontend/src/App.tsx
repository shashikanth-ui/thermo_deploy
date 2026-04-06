import { Routes, Route } from 'react-router-dom'
import Topbar from './components/Topbar'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Clients from './pages/Clients'
import Output from './pages/Output'
import QuoteSetup from './pages/QuoteSetup'
import Pricing from './pages/Pricing'
import Insights from './pages/Insights'
import { StoreProvider } from './lib/store'

export default function App() {
  return (
    <StoreProvider>
      <Topbar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/output" element={<Output />} />
          <Route path="/quote-setup" element={<QuoteSetup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </div>
    </StoreProvider>
  )
}
