import React, { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Badge } from './ui'

interface GraphNode {
    id: string
    label: string
    type: string
}

interface GraphEdge {
    source: string
    target: string
    type: string
}

interface GraphData {
    nodes: GraphNode[]
    edges: GraphEdge[]
}

interface Props {
    open: boolean
    onClose: () => void
    productName: string
    graphData: GraphData | null
    loading?: boolean
}

const NODE_COLORS: Record<string, string> = {
    Product: '#7c3aed', // Deep purple — flagship
    Competitor: '#dc2626', // Crimson red
    Company: '#2563eb', // Royal blue
    CapabilityGroup: '#0284c7', // Sky blue
    Deal: '#0f766e', // Teal green
    Customer: '#16a34a', // Forest green
    Strength: '#15803d', // Rich green ✅ (user req)
    Weakness: '#ea580c', // Orangish-red ✅ (user req)
    DecisionDriver: '#7c3aed', // Violet (matches product family)
    default: '#94a3b8',
}

const NODE_SIZES: Record<string, number> = {
    Product: 16,
    Competitor: 11,
    Company: 12,
    CapabilityGroup: 10,
    Deal: 9,
    Customer: 9,
    Strength: 10,
    Weakness: 10,
    DecisionDriver: 10,
    default: 7,
}

export default function GraphModal({ open, onClose, productName, graphData, loading }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const fgRef = useRef<any>(null)
    const [dimensions, setDimensions] = useState({ width: 900, height: 550 })
    const [selectedNode, setSelectedNode] = useState<any | null>(null)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    // Reset selected node and filter when modal is closed/opened
    useEffect(() => {
        if (!open) {
            setSelectedNode(null)
            setActiveFilter(null)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const update = () => {
            if (containerRef.current) {
                const r = containerRef.current.getBoundingClientRect()
                setDimensions({ width: r.width, height: r.height })
            }
        }
        setTimeout(update, 100) // wait for layout
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [open])

    // After data loads, zoom to fit
    useEffect(() => {
        if (fgRef.current && graphData && graphData.nodes.length > 0) {
            setTimeout(() => {
                fgRef.current?.zoomToFit(400, 60)
            }, 600)
        }
    }, [graphData])

    const fgData = React.useMemo(() => {
        if (!graphData) return { nodes: [], links: [] }
        // Clone nodes to avoid mutation issues
        const nodes = (graphData.nodes || []).map(n => ({ ...n }))
        const links = (graphData.edges || []).map(e => ({
            source: e.source,
            target: e.target,
            label: e.type,
        }))
        return { nodes, links }
    }, [graphData])

    // Filtered graph data — when a filter is active, keep only matching nodes + 1-hop neighbors
    const filteredFgData = React.useMemo(() => {
        if (!activeFilter) return fgData

        // Seed: nodes matching the filter type
        const seedIds = new Set(fgData.nodes.filter(n => n.type === activeFilter).map(n => n.id))

        // Expand to 1-hop neighbors via links
        const neighborIds = new Set<string>()
        fgData.links.forEach(l => {
            const srcId = typeof l.source === 'object' ? (l.source as any)?.id : l.source
            const tgtId = typeof l.target === 'object' ? (l.target as any)?.id : l.target
            if (seedIds.has(srcId)) neighborIds.add(tgtId)
            if (seedIds.has(tgtId)) neighborIds.add(srcId)
        })

        const keepIds = new Set([...seedIds, ...neighborIds])
        const nodes = fgData.nodes.filter(n => keepIds.has(n.id))
        const links = fgData.links.filter(l => {
            const srcId = typeof l.source === 'object' ? (l.source as any)?.id : l.source
            const tgtId = typeof l.target === 'object' ? (l.target as any)?.id : l.target
            return keepIds.has(srcId) && keepIds.has(tgtId)
        })
        return { nodes, links }
    }, [fgData, activeFilter])

    // Re-zoom to fit whenever the filter changes
    useEffect(() => {
        if (fgRef.current && filteredFgData.nodes.length > 0) {
            setTimeout(() => {
                fgRef.current?.zoomToFit(400, 60)
            }, 300)
        }
    }, [activeFilter])

    const getShortLabel = useCallback((node: any): string => {
        if (!graphData) return node.label || node.id

        if (node.type === 'Strength') {
            const arr = graphData.nodes.filter(n => n.type === 'Strength')
            const idx = arr.findIndex(n => n.id === node.id) + 1
            return `S${idx}`
        }
        if (node.type === 'Weakness') {
            const arr = graphData.nodes.filter(n => n.type === 'Weakness')
            const idx = arr.findIndex(n => n.id === node.id) + 1
            return `W${idx}`
        }
        if (node.type === 'DecisionDriver') {
            const arr = graphData.nodes.filter(n => n.type === 'DecisionDriver')
            const idx = arr.findIndex(n => n.id === node.id) + 1
            return `DD${idx}`
        }
        if (node.type === 'Deal') {
            const arr = graphData.nodes.filter(n => n.type === 'Deal')
            const idx = arr.findIndex(n => n.id === node.id) + 1
            return `Deal ${idx}`
        }

        const label = node.label || node.id
        // Smart truncation
        if (label.length > 16) {
            const words = label.split(' ')
            if (words.length >= 2) return words.slice(0, 2).join(' ')
            return label.slice(0, 14) + '…'
        }
        return label
    }, [graphData])

    const nodePaint = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = getShortLabel(node)
        const r = NODE_SIZES[node.type] || NODE_SIZES.default
        const color = NODE_COLORS[node.type] || NODE_COLORS.default
        const isSelected = selectedNode?.id === node.id

        ctx.save()

        // Glow for selected
        if (isSelected) {
            ctx.shadowColor = color
            ctx.shadowBlur = 20
        }

        // Circle fill
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()

        // White border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2 / globalScale
        ctx.stroke()

        // Extra ring for selected
        if (isSelected) {
            ctx.shadowBlur = 0
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 3 / globalScale, 0, 2 * Math.PI)
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5 / globalScale
            ctx.stroke()
        }

        // Label INSIDE the circle — scales with node, stays readable at any zoom
        ctx.save()

        // Clip to circle so nothing bleeds out
        ctx.beginPath()
        ctx.arc(node.x, node.y, r - 0.5, 0, 2 * Math.PI)
        ctx.clip()

        // Font in canvas units (not screen pixels), proportional to node size
        // This ensures text scales correctly when zooming in/out
        const maxTextWidth = r * 1.8           // usable inner width (canvas units)
        let fontSize = Math.max(r * 0.62, 2)   // ~62% of radius as starting font
        ctx.font = `bold ${fontSize}px Inter, sans-serif`
        const tw = ctx.measureText(label).width
        if (tw > maxTextWidth) {
            // Scale down so label always fits
            fontSize = fontSize * (maxTextWidth / tw)
            ctx.font = `bold ${fontSize}px Inter, sans-serif`
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255,255,255,0.97)'
        ctx.fillText(label, node.x, node.y)

        ctx.restore()

        ctx.restore()
    }, [getShortLabel, selectedNode])

    const linkPaint = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (globalScale < 0.5) return // skip labels when too zoomed out
        const label = link.label || ''
        if (!label) return
        const sx = link.source?.x ?? 0
        const sy = link.source?.y ?? 0
        const tx = link.target?.x ?? 0
        const ty = link.target?.y ?? 0
        const mx = (sx + tx) / 2
        const my = (sy + ty) / 2
        const fontSize = Math.max(7 / globalScale, 3)
        ctx.save()
        ctx.font = `${fontSize}px Inter, sans-serif`
        ctx.fillStyle = 'rgba(100,116,139,0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label.toLowerCase().replace(/_/g, ' '), mx, my)
        ctx.restore()
    }, [])

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode((prev: any) => prev?.id === node.id ? null : node)
    }, [])

    // Pin node in place after drag so it doesn't spring back
    const handleNodeDragEnd = useCallback((node: any) => {
        node.fx = node.x
        node.fy = node.y
    }, [])

    if (!open) return null

    const hasData = fgData.nodes.length > 0

    // Get relationships for selected node
    const nodeRelationships = selectedNode
        ? fgData.links.filter(l => {
            const srcId = typeof l.source === 'object' ? (l.source as any)?.id : l.source
            const tgtId = typeof l.target === 'object' ? (l.target as any)?.id : l.target
            return srcId === selectedNode.id || tgtId === selectedNode.id
        })
        : []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-gradient-to-r from-brand/5 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white shadow">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-text-primary">Knowledge Graph</h2>
                            <p className="text-[10px] text-brand font-medium uppercase tracking-wider truncate max-w-[220px]">{productName}</p>
                        </div>
                    </div>

                    {/* Clickable Filter Legend */}
                    {hasData && (
                        <div className="hidden md:flex items-center gap-1.5 mr-4 flex-wrap">
                            {/* All pill */}
                            <button
                                onClick={() => setActiveFilter(null)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                    activeFilter === null
                                        ? 'bg-slate-700 text-white border-slate-700 shadow'
                                        : 'bg-white text-text-muted border-gray-200 hover:border-slate-400 hover:text-slate-600'
                                }`}
                            >
                                All
                            </button>
                            {/* One pill per node type that exists in the current graph */}
                            {Object.entries(NODE_COLORS)
                                .filter(([k]) => k !== 'default' && fgData.nodes.some(n => n.type === k))
                                .map(([type, color]) => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilter(prev => prev === type ? null : type)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                            activeFilter === type
                                                ? 'text-white border-transparent shadow scale-105'
                                                : 'bg-white text-text-muted border-gray-200 hover:border-current'
                                        }`}
                                        style={activeFilter === type ? { backgroundColor: color, borderColor: color } : { color }}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: activeFilter === type ? 'rgba(255,255,255,0.7)' : color }}
                                        />
                                        {type}
                                    </button>
                                ))
                            }
                        </div>
                    )}

                    <button onClick={onClose} className="rounded-xl p-2 text-text-secondary hover:bg-gray-100 transition-colors flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Stats bar */}
                {hasData && (
                    <div className="flex items-center gap-5 px-5 py-1.5 bg-slate-50 border-b border-border text-[11px] text-text-muted flex-shrink-0">
                        <span>
                            <strong className="text-text-primary">{filteredFgData.nodes.length}</strong>
                            {activeFilter ? ` / ${fgData.nodes.length}` : ''} Nodes
                        </span>
                        <span>
                            <strong className="text-text-primary">{filteredFgData.links.length}</strong>
                            {activeFilter ? ` / ${fgData.links.length}` : ''} Edges
                        </span>
                        {activeFilter ? (
                            <span className="hidden sm:inline font-medium" style={{ color: NODE_COLORS[activeFilter] }}>
                                Filtering: {activeFilter} + neighbors
                            </span>
                        ) : (
                            <span className="hidden sm:inline">🖱 Drag to pan · Scroll to zoom · Click node for details</span>
                        )}
                        {selectedNode && (
                            <span className="ml-auto text-brand font-medium">
                                {selectedNode.type}: {getShortLabel(selectedNode)}
                            </span>
                        )}
                    </div>
                )}

                {/* Graph area — full width, sidebar overlays */}
                <div className="relative flex-1 bg-[#f8fafc]" style={{ minHeight: 460 }} ref={containerRef}>
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-sm">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                            <div className="text-sm font-medium text-text-secondary">Loading graph from Neo4j...</div>
                        </div>
                    )}

                    {!loading && !hasData && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
                            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-text-primary">No graph data available</p>
                                <p className="text-sm text-text-secondary mt-1">Ensure Neo4j is connected and data is ingested.</p>
                            </div>
                        </div>
                    )}

                    {!loading && hasData && (
                        <ForceGraph2D
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={filteredFgData}
                            nodeCanvasObject={nodePaint}
                            nodeCanvasObjectMode={() => 'replace'}
                            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                                // Explicitly define the hit area for each node so clicks and drags work
                                const r = (NODE_SIZES[node.type] || NODE_SIZES.default) + 4
                                ctx.fillStyle = color
                                ctx.beginPath()
                                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false)
                                ctx.fill()
                            }}
                            linkCanvasObjectMode={() => 'after'}
                            linkCanvasObject={linkPaint}
                            linkColor={() => '#cbd5e1'}
                            linkWidth={1.2}
                            linkDirectionalArrowLength={4}
                            linkDirectionalArrowRelPos={1}
                            linkDirectionalArrowColor={() => '#94a3b8'}
                            backgroundColor="transparent"
                            cooldownTicks={200}
                            nodeRelSize={6}
                            d3AlphaDecay={0.02}
                            d3VelocityDecay={0.3}
                            onNodeClick={handleNodeClick}
                            onBackgroundClick={() => setSelectedNode(null)}
                            onNodeDragEnd={handleNodeDragEnd}
                            enableNodeDrag={true}
                            enableZoomInteraction={true}
                            enablePanInteraction={true}
                        />
                    )}

                    {/* NODE DETAILS PANEL — overlays on the right, doesn't affect graph canvas size */}
                    {selectedNode && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                height: '100%',
                                width: '280px',
                                background: '#ffffff',
                                borderLeft: '1px solid #E6EAF0',
                                boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
                                zIndex: 30,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Panel Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: NODE_COLORS[selectedNode.type] || '#94a3b8' }}
                                    />
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-text-primary">
                                        {selectedNode.type || 'Node'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="h-6 w-6 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-200 transition-colors text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Full Label */}
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">Full Name / Value</div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-border text-[13px] text-text-primary leading-relaxed font-medium">
                                        {selectedNode.label || selectedNode.id || 'N/A'}
                                    </div>
                                </div>

                                {/* Type badge */}
                                <div className="flex items-center gap-2">
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Type</div>
                                    <span
                                        className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: NODE_COLORS[selectedNode.type] || '#94a3b8' }}
                                    >
                                        {selectedNode.type}
                                    </span>
                                </div>

                                {/* Strength context card */}
                                {selectedNode.type === 'Strength' && (
                                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Market Strength</span>
                                        </div>
                                        <p className="text-[12px] text-emerald-800 leading-relaxed">
                                            A key advantage identified in the product knowledge graph.
                                        </p>
                                    </div>
                                )}

                                {/* Weakness context card */}
                                {selectedNode.type === 'Weakness' && (
                                    <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16" />
                                                <path d="M12 9v4M12 17h.01" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Risk / Gap</span>
                                        </div>
                                        <p className="text-[12px] text-amber-800 leading-relaxed">
                                            A noted competitive gap or area for improvement.
                                        </p>
                                    </div>
                                )}

                                {/* Relationships list */}
                                {nodeRelationships.length > 0 && (
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">
                                            Connections ({nodeRelationships.length})
                                        </div>
                                        <div className="space-y-1.5">
                                            {nodeRelationships.map((l, i) => {
                                                const srcId = typeof l.source === 'object' ? (l.source as any)?.id : l.source
                                                const tgtId = typeof l.target === 'object' ? (l.target as any)?.id : l.target
                                                const isOutgoing = srcId === selectedNode.id
                                                const otherNodeId = isOutgoing ? tgtId : srcId
                                                const otherNode = fgData.nodes.find(n => n.id === otherNodeId)
                                                const otherLabel = otherNode ? getShortLabel(otherNode) : otherNodeId
                                                return (
                                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px]">
                                                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${isOutgoing ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-text-secondary'}`}>
                                                            {isOutgoing ? '→' : '←'}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
                                                            {(l.label || '').toLowerCase().replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-text-primary font-medium truncate">{otherLabel}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 border-t border-border bg-gray-50 flex-shrink-0">
                                <div className="text-[9px] text-center text-text-muted">Neo4j Aura Knowledge Graph</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
