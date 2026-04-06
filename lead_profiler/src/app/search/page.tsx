'use client'

import { useState } from 'react'
import { Search, Sparkles, Database, ArrowRight, Building2, Zap, Target } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [answer, setAnswer] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [isSeeding, setIsSeeding] = useState(false)

    const handleSeed = async () => {
        setIsSeeding(true)
        try {
            const res = await fetch('/api/seed', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                alert(data.message + (data.debug_errors && data.debug_errors.length > 0 ? '\n\nErrors:\n' + data.debug_errors.join('\n') : ''))
            }
            else alert('Error: ' + data.error)
        } catch (e) {
            alert('Failed to seed DB')
        }
        setIsSeeding(false)
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setIsSearching(true)
        setResults([])
        setAnswer('')

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                body: JSON.stringify({ query }),
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            setResults(data.results || [])
            setAnswer(data.answer || '')
        } catch (e) {
            console.error(e)
        }
        setIsSearching(false)
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Target className="text-white size-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Funnel Growth AI</span>
                    </div>
                    <nav className="flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/search" className="text-sm font-medium text-indigo-400">
                            Search Intelligence
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">

                {/* Hero Search */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                        Find Your Perfect Accounts
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Search our Knowledge Graph using natural language. The AI will retrieve the best fitting accounts and explain why.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 mb-12 shadow-2xl shadow-indigo-500/10">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. 'Marketing automation tools for enterprise with >500 employees'"
                                className="pl-12 h-14 bg-transparent border-none text-lg focus-visible:ring-0 placeholder:text-slate-600"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSearching}
                            className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 transition-all"
                        >
                            {isSearching ? <Sparkles className="animate-spin size-5" /> : "Search"}
                        </Button>
                    </form>
                </div>

                {/* AI Answer Section */}
                {answer && (
                    <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="text-indigo-400 size-5" />
                            <h3 className="font-semibold text-indigo-100">AI Summary</h3>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6 text-indigo-100 leading-relaxed shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                            {answer}
                        </div>
                    </div>
                )}

                {/* Results Grid */}
                <div className="space-y-6">
                    {results.map((company, i) => (
                        <Card key={company.id} className="bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 transition-colors animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards" style={{ animationDelay: `${i * 100}ms` }}>
                            <CardContent className="p-6 flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                            {company.company_name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
                                                {company.company_name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Building2 className="size-3" />
                                                <span>{company.industry}</span>
                                                <span>•</span>
                                                <span>{company.employee_count || 'Unknown Size'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm line-clamp-2">
                                        {company.description || company.executive_summary}
                                    </p>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-bold mb-2">
                                        {Math.round((company.similarity || 0) * 100)}% Match
                                    </div>
                                    <div>
                                        <Button size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800 text-xs h-8">
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {results.length === 0 && !isSearching && query && (
                        <div className="text-center py-12 text-slate-500">
                            No matching accounts found.
                        </div>
                    )}
                </div>


                {/* Admin Footer */}
                <div className="mt-24 pt-8 border-t border-white/5 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="text-slate-600 hover:text-indigo-400 text-xs"
                    >
                        <Database className="size-3 mr-2" />
                        {isSeeding ? "Ingesting Knowledge Graph..." : "Admin: Re-Index Knowledge Graph (CSV)"}
                    </Button>
                </div>

            </main>
        </div>
    )
}
