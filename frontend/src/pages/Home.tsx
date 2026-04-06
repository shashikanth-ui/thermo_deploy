import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui'

export default function Home() {
  const nav = useNavigate()

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-b from-white to-slate-100/50 px-4">
      <div className="w-full max-w-4xl py-12">
        <div className="relative text-center">
          <div className="absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-brand/5 blur-3xl" />
          <h1 className="bg-gradient-to-r from-text-primary to-brand bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            ThermoFisher Sales
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            Empowering sales team with AI-driven product intelligence,
            precision recommendations, and automated CPQ.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          <div
            onClick={() => window.open('http://localhost:4000', '_blank')}
            className="group cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <Card
              className="h-full border border-slate-200 transition-all duration-300 bg-slate-50 shadow-sm hover:shadow-md hover:border-indigo-400 p-8"
              title={<span className="text-2xl font-bold text-text-primary">Twin Hunter Agent</span>}
              right={<span className="text-brand transition-transform group-hover:translate-x-2 text-2xl">→</span>}
            >
              <p className="mt-4 text-sm leading-relaxed text-text-secondary font-medium">
                Autonomous look-alike discovery. Scan the CRM to find your next high-value customers using AI-powered pattern matching.
              </p>
            </Card>
          </div>

          <div
            onClick={() => nav('/agent')}
            className="group cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <Card
              className="h-full border border-slate-200 transition-all duration-300 bg-slate-50 shadow-sm hover:shadow-md hover:border-brand/40 p-8"
              title={<span className="text-2xl font-bold text-text-primary">CPQ Agent</span>}
              right={<span className="text-brand transition-transform group-hover:translate-x-2 text-2xl">→</span>}
            >
              <p className="mt-4 text-sm leading-relaxed text-text-secondary font-medium">
                Intelligent Product Recommendation & Quote Generation. Convert complex requirements into accurate configurations and pricing instantly.
              </p>
            </Card>
          </div>
        </div>


      </div>
    </div>
  )
}
