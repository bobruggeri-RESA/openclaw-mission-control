'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Radio, RefreshCw, Filter } from 'lucide-react'
import { Session, ActivityItem, ActivityType, AgentName } from '@/lib/types'
import { AgentBadge, Badge } from '@/components/ui/Badge'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { formatDistanceToNow, format } from 'date-fns'
import { AGENT_NAMES } from '@/config/agents'

const TYPE_CONFIG: Record<ActivityType, { color: string; label: string; bg: string }> = {
  tool: { color: '#60A5FA', label: 'Tool', bg: 'rgba(96,165,250,0.08)' },
  assistant: { color: '#A78BFA', label: 'Assistant', bg: 'rgba(167,139,250,0.08)' },
  user: { color: '#34D399', label: 'User', bg: 'rgba(52,211,153,0.08)' },
  system: { color: '#FBBF24', label: 'System', bg: 'rgba(251,191,36,0.08)' },
  cron: { color: '#F87171', label: 'Cron', bg: 'rgba(248,113,113,0.08)' },
}

function buildActivityItems(sessions: Session[]): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const session of sessions) {
    // Create activity items from session data
    if (session.lastActivity) {
      items.push({
        id: `session-${session.agentId}-${session.key}`,
        agentId: session.agentId,
        agentName: session.agentName,
        type: 'user',
        content: session.label
          ? `Session: ${session.label}`
          : `Session ${session.key?.slice(-8) || 'unknown'} — ${session.messageCount || 0} messages, ${session.tokenCount?.toLocaleString() || 0} tokens`,
        timestamp: session.lastActivity,
        sessionKey: session.key,
        model: session.model,
      })
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp)
}

function FeedItem({ item }: { item: ActivityItem }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system

  return (
    <div
      className="flex gap-4 p-4 rounded-xl transition-all animate-fade-in"
      style={{ background: config.bg, border: `1px solid ${config.color}22` }}
    >
      <div className="flex-shrink-0 flex flex-col items-center gap-2">
        <div
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background: config.color,
            boxShadow: `0 0 6px ${config.color}`,
            marginTop: 4,
          }}
        />
        <div style={{ width: 1, flex: 1, background: `${config.color}20`, minHeight: 8 }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <AgentBadge agentId={item.agentId} agentName={item.agentName} />
          <Badge variant="gray" size="sm" style={{ background: `${config.color}15`, color: config.color }}>
            {config.label}
          </Badge>
          {item.toolName && (
            <span className="text-xs font-mono" style={{ color: '#60A5FA' }}>
              {item.toolName}
            </span>
          )}
          {item.model && (
            <span className="text-xs" style={{ color: '#475569' }}>
              {item.model.split('/').pop()}
            </span>
          )}
        </div>

        <p className="text-sm" style={{ color: '#94A3B8' }}>
          {item.content}
        </p>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs" style={{ color: '#475569' }}>
            {format(new Date(item.timestamp), 'MMM d, HH:mm:ss')}
          </span>
          <span className="text-xs" style={{ color: '#334155' }}>
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  const allItems = buildActivityItems(sessions)

  const filteredItems = allItems.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (agentFilter !== 'all' && item.agentId !== agentFilter) return false
    return true
  })

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Radio size={24} style={{ color: '#60A5FA' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
              Activity Feed
            </h1>
            <Badge variant="blue">{filteredItems.length} events</Badge>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'rgba(42,42,62,0.5)',
                color: autoRefresh ? '#34D399' : '#64748B',
                border: `1px solid ${autoRefresh ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
              }}
            >
              <RefreshCw size={14} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'rgba(96,165,250,0.1)',
                color: '#60A5FA',
                border: '1px solid rgba(96,165,250,0.2)',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div
          className="flex items-center gap-4 flex-wrap p-3 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: '#64748B' }} />
            <span className="text-sm font-medium" style={{ color: '#64748B' }}>Type:</span>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'tool', 'assistant', 'user', 'system', 'cron'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: typeFilter === type
                      ? type === 'all' ? 'rgba(96,165,250,0.15)' : `${TYPE_CONFIG[type as ActivityType]?.color}22`
                      : 'transparent',
                    color: typeFilter === type
                      ? type === 'all' ? '#60A5FA' : TYPE_CONFIG[type as ActivityType]?.color
                      : '#64748B',
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#64748B' }}>Agent:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setAgentFilter('all')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: agentFilter === 'all' ? 'rgba(96,165,250,0.15)' : 'transparent',
                  color: agentFilter === 'all' ? '#60A5FA' : '#64748B',
                }}
              >
                All
              </button>
              {AGENT_NAMES.map((id) => {
                const color = id === 'nelson' ? '#60A5FA' : id === 'kitt' ? '#34D399' : '#A78BFA'
                return (
                  <button
                    key={id}
                    onClick={() => setAgentFilter(id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: agentFilter === id ? `${color}22` : 'transparent',
                      color: agentFilter === id ? color : '#64748B',
                    }}
                  >
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-16" style={{ color: '#475569' }}>
            <Radio size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
            <p>No activity found with current filters</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
