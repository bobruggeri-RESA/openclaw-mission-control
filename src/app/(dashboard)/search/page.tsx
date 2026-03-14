'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, FileText, Activity, Clock, Brain, Loader2 } from 'lucide-react'
import { AgentBadge, Badge } from '@/components/ui/Badge'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AgentName } from '@/lib/types'
import Link from 'next/link'

interface SearchResult {
  id: string
  category: 'memory' | 'session' | 'cron' | 'file'
  title: string
  snippet: string
  agentId?: AgentName
  agentName?: string
  href?: string
}

const CATEGORY_CONFIG = {
  memory: { label: 'Memory', icon: Brain, color: '#A78BFA' },
  session: { label: 'Sessions', icon: Activity, color: '#60A5FA' },
  cron: { label: 'Cron Jobs', icon: Clock, color: '#FBBF24' },
  file: { label: 'Files', icon: FileText, color: '#34D399' },
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} style={{ background: '#FBBF2433', color: '#FBBF24', borderRadius: 2 }}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const config = CATEGORY_CONFIG[result.category]
  const Icon = config.icon

  return (
    <div
      className="p-4 rounded-xl transition-all"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: `${config.color}15` }}
        >
          <Icon size={14} color={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              variant="gray"
              size="sm"
              style={{ background: `${config.color}15`, color: config.color }}
            >
              {config.label}
            </Badge>
            {result.agentId && (
              <AgentBadge agentId={result.agentId} agentName={result.agentName || result.agentId} />
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
            {highlightText(result.title, query)}
          </p>
          {result.snippet && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: '#64748B' }}>
              {highlightText(result.snippet, query)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Cmd+K focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setSearching(true)
    try {
      const allResults: SearchResult[] = []

      // Search in parallel
      const [sessionsRes, cronRes, memoryRes] = await Promise.allSettled([
        fetch('/api/sessions').then((r) => r.json()),
        fetch('/api/cron').then((r) => r.json()),
        fetch(`/api/memory?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      ])

      // Sessions
      if (sessionsRes.status === 'fulfilled') {
        const sessions = sessionsRes.value.sessions || []
        for (const s of sessions) {
          if (
            s.key?.toLowerCase().includes(q.toLowerCase()) ||
            s.label?.toLowerCase().includes(q.toLowerCase()) ||
            s.model?.toLowerCase().includes(q.toLowerCase())
          ) {
            allResults.push({
              id: `session-${s.agentId}-${s.key}`,
              category: 'session',
              title: s.label || `Session ${s.key?.slice(-12) || 'unknown'}`,
              snippet: `Agent: ${s.agentName} | Model: ${s.model?.split('/').pop() || 'unknown'} | ${s.tokenCount?.toLocaleString() || 0} tokens`,
              agentId: s.agentId,
              agentName: s.agentName,
              href: `/sessions`,
            })
          }
        }
      }

      // Cron jobs
      if (cronRes.status === 'fulfilled') {
        const jobs = cronRes.value.jobs || []
        for (const j of jobs) {
          if (
            j.name?.toLowerCase().includes(q.toLowerCase()) ||
            j.prompt?.toLowerCase().includes(q.toLowerCase()) ||
            j.schedule?.expr?.includes(q)
          ) {
            allResults.push({
              id: `cron-${j.agentId}-${j.id}`,
              category: 'cron',
              title: j.name || j.id,
              snippet: `${j.schedule?.expr} — ${j.prompt?.slice(0, 100)}`,
              agentId: j.agentId,
              agentName: j.agentName,
              href: '/cron',
            })
          }
        }
      }

      // Memory search
      if (memoryRes.status === 'fulfilled') {
        const memResults = memoryRes.value.results || []
        for (const r of memResults) {
          allResults.push({
            id: `memory-${r.agentId}-${r.path}`,
            category: 'memory',
            title: r.path?.split('/').pop() || r.path,
            snippet: r.content?.slice(0, 150),
            agentId: r.agentId,
            agentName: r.agentName,
            href: '/memory',
          })
        }
      }

      setResults(allResults)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(query), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, performSearch])

  // Group results by category
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Search size={24} style={{ color: '#60A5FA' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
            Search
          </h1>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: '#64748B' }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, memory, cron jobs... (⌘K)"
            className="w-full pl-12 pr-12 py-3.5 rounded-xl text-base transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: '#E2E8F0',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#60A5FA')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            autoFocus
          />
          {searching && (
            <Loader2
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{ color: '#64748B', animation: 'spin 0.8s linear infinite' }}
            />
          )}
        </div>

        {/* Results */}
        {query && (
          <div>
            {results.length > 0 ? (
              <div className="space-y-6">
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
                </p>

                {Object.entries(grouped).map(([category, items]) => {
                  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
                  if (!config) return null

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <config.icon size={14} color={config.color} />
                        <h2 className="text-sm font-semibold" style={{ color: config.color }}>
                          {config.label}
                        </h2>
                        <Badge variant="gray" size="sm">{items.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((result) => (
                          <ResultCard key={result.id} result={result} query={query} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !searching ? (
              <div className="text-center py-16" style={{ color: '#475569' }}>
                <Search size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
                <p>No results found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : null}
          </div>
        )}

        {!query && (
          <div className="text-center py-16" style={{ color: '#475569' }}>
            <Search size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
            <p className="text-base mb-2" style={{ color: '#64748B' }}>Search across all agents</p>
            <p className="text-sm">Sessions, memory files, cron jobs, and more</p>
            <div className="flex items-center justify-center gap-6 mt-6">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5 text-sm" style={{ color: '#475569' }}>
                  <config.icon size={14} color={config.color} />
                  {config.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
