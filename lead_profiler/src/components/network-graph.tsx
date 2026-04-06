'use client'

import { Target, Building2, TrendingUp, Zap, HelpCircle } from 'lucide-react'

interface NetworkGraphProps {
    companyName: string
    score: number
    lookalikes: string[]
    signals: string[]
}

export function NetworkGraph({ companyName, score, lookalikes = [], signals = [] }: NetworkGraphProps) {
    // We render a static flexible layout that looks like a graph
    // Center: Target
    // Top: Score/ICP
    // Left/Right: Lookalikes
    // Bottom: Signals

    return (
        <div className="relative h-[320px] w-full bg-gradient-to-br from-black/60 to-indigo-950/20 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Connecting Lines (SVG) */}
            <svg className="absolute inset-0 size-full pointer-events-none opacity-40">
                {/* Center to Top (ICP) */}
                <line x1="50%" y1="50%" x2="50%" y2="15%" stroke="#4ade80" strokeWidth="2" strokeDasharray="4 4" />

                {/* Center to Left (Lookalike 1) */}
                {lookalikes[0] && <line x1="50%" y1="50%" x2="20%" y2="40%" stroke="white" strokeWidth="1" />}

                {/* Center to Right (Lookalike 2) */}
                {lookalikes[1] && <line x1="50%" y1="50%" x2="80%" y2="40%" stroke="white" strokeWidth="1" />}

                {/* Center to Bottom Left (Signal 1) */}
                {signals[0] && <line x1="50%" y1="50%" x2="30%" y2="80%" stroke="#a855f7" strokeWidth="2" />}

                {/* Center to Bottom Right (Signal 2) */}
                {signals[1] && <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="#a855f7" strokeWidth="2" />}
            </svg>

            {/* NODES */}

            {/* 1. Center Node (Target) */}
            <div className="absolute z-20 flex flex-col items-center animate-in zoom-in duration-500">
                <div className="size-20 rounded-full bg-indigo-600 flex items-center justify-center border-4 border-black shadow-[0_0_30px_rgba(79,70,229,0.5)] z-20 relative">
                    <span className="font-bold text-white text-2xl">{companyName.substring(0, 2).toUpperCase()}</span>
                    {/* Orbit Ring */}
                    <div className="absolute inset-[-4px] rounded-full border border-indigo-500/50 animate-pulse"></div>
                </div>
                <div className="mt-2 px-3 py-1 bg-black/50 rounded-full border border-white/10 text-xs font-semibold backdrop-blur-sm">
                    {companyName}
                </div>
            </div>

            {/* 2. Top Node (ICP Score) */}
            <div className="absolute top-8 z-20 flex flex-col items-center gap-1 animate-in slide-in-from-top-4 duration-700">
                <div className={`size-12 rounded-full border-2 flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.3)] bg-black/80 ${score >= 80 ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'}`}>
                    <span className="font-bold">{score}%</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-green-500/80 bg-black/40 px-2 py-0.5 rounded">ICP Fit</span>
            </div>

            {/* 3. Lookalike Nodes */}
            {lookalikes[0] && (
                <div className="absolute left-[10%] top-[30%] z-10 flex flex-col items-center gap-1 animate-in slide-in-from-left-4 duration-700 delay-100">
                    <span className="text-[8px] uppercase font-bold tracking-wider text-red-500/80 bg-red-950/30 px-1 rounded border border-red-500/20">Competitor</span>
                    <div className="size-10 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center hover:bg-red-900/40 transition-colors cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        <Building2 className="size-5 text-red-400" />
                    </div>
                    <span className="text-[10px] text-red-200/80 max-w-[80px] text-center font-medium">{lookalikes[0]}</span>
                </div>
            )}

            {lookalikes[1] && (
                <div className="absolute right-[10%] top-[30%] z-10 flex flex-col items-center gap-1 animate-in slide-in-from-right-4 duration-700 delay-150">
                    <span className="text-[8px] uppercase font-bold tracking-wider text-red-500/80 bg-red-950/30 px-1 rounded border border-red-500/20">Competitor</span>
                    <div className="size-10 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center hover:bg-red-900/40 transition-colors cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        <Building2 className="size-5 text-red-400" />
                    </div>
                    <span className="text-[10px] text-red-200/80 max-w-[80px] text-center font-medium">{lookalikes[1]}</span>
                </div>
            )}

            {/* 4. Signal Nodes */}
            {signals[0] && (
                <div className="absolute bottom-[10%] left-[20%] z-10 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="size-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                        <Zap className="size-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] text-purple-300 max-w-[100px] text-center truncate px-2">{signals[0]}</span>
                </div>
            )}

            {signals[1] && (
                <div className="absolute bottom-[10%] right-[20%] z-10 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                    <div className="size-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                        <TrendingUp className="size-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] text-purple-300 max-w-[100px] text-center truncate px-2">{signals[1]}</span>
                </div>
            )}

        </div>
    )
}
