'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Session, SessionMessage, MessagePart, AgentName } from '@/lib/types'
import { Badge, AgentBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { formatDistanceToNow, format } from 'date-fns'
import { AGENT_NAMES } from '@/config/agents'

const ROLE_COLORS = {
  user: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', text: '#34D399', label: 'User' },
  assistant: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', text: '#A78BFA', label: 'Assistant' },
  tool: { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', text: '#60A5FA', label: 'Tool' },
}

function renderMessageContent(content: string | MessagePart[]): React.ReactNode {
  if (typeof content === 'string') {
    return <p className="text-sm whitespace-pre-wrap" style={{ color: '#94A3B8' }}>{content}</p>
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {content.map((part, i) => {
          if (part.type === 'text') {
            return (
              <p key={i} className="text-sm whitespace-pre-wrap" style={{ color: '#94A3B8' }}>
                {part.text}
              </p>
            )
          }
          if (part.type === 'toolCall') {
            return (
              <div
                key={i}
                className="rounded-lg p-3 font-mono text-xs"
                style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
              >
                <span style={{ color: '#60A5FA' }}>⚡ {part.name}</span>
                {part.arguments && (
                  <pre className="mt-1 overflow-x-auto" style={{ color: '#64748B' }}>
                    {JSON.stringify(part.arguments, null, 2)}
                  </pre>
                )}
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  return null
}

function MessageItem({ message }: { message: SessionMessage }) {
  const role = message.role as 'user' | 'assistant' | 'tool'
  const colors = ROLE_COLORS[role] || ROLE_COLORS.user

  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
          {colors.label}
        </span>
        {message.timestamp && (
          <span className="text-xs" style={{ color: '#475569' }}>
            {format(new Date(message.timestamp), 'HH:mm:ss')}
          </span>
        )}
      </div>
      {renderMessageContent(message.content as string | MessagePart[])}
    </div>
  )
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const loadMessages = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/sessions?key=${session.key}&agent=${session.agentId}`)
      const data = await res.json()
      setMessages(data.session?.messages || [])
    } finally {
      setLoadingMessages(false)
    }
  }

  return (
    <>
      <tr
        onClick={loadMessages}
        className="cursor-pointer transition-colors hover:bg-white/5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <td className="px-4 py-3">
          <AgentBadge agentId={session.agentId} agentName={session.agentName} />
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs" style={{ color: '#64748B' }}>
            {session.key?.slice(-16) || 'unknown'}
          </span>
          {session.label && (
            <span className="ml-2 text-xs" style={{ color: '#94A3B8' }}>{session.label}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {session.model && (
            <span className="text-xs font-mono" style={{ color: '#64748B' }}>
              {session.model.split('/').pop()}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm" style={{ color: '#E2E8F0' }}>
            {session.tokenCount?.toLocaleString() || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm" style={{ color: '#94A3B8' }}>
            {session.messageCount || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs" style={{ color: '#64748B' }}>
            {session.lastActivity
              ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })
              : '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {expanded ? (
            <ChevronUp size={14} style={{ color: '#64748B' }} className="mx-auto" />
          ) : (
            <ChevronDown size={14} style={{ color: '#64748B' }} className="mx-auto" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td
            colSpan={7}
            className="px-4 py-3"
            style={{ background: 'rgba(10,10,15,0.5)', borderBottom: '1px solid var(--border)' }}
          >
            {loadingMessages ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 skeleton rounded" />
                ))}
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {messages.map((msg, i) => (
                  <MessageItem key={i} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
                No messages available
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState<string>('all')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const url = agentFilter !== 'all' ? `/api/sessions?agent=${agentFilter}` : '/api/sessions'
      const res = await fetch(url)
      const data = await res.json()
      setSessions(data.sessions || [])
    } finally {
      setLoading(false)
    }
  }, [agentFilter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filteredSessions = agentFilter === 'all'
    ? sessions
    : sessions.filter((s) => s.agentId === agentFilter)

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={24} style={{ color: '#60A5FA' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
              Sessions
            </h1>
            <Badge variant="blue">{filteredSessions.length}</Badge>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: '#64748B' }} />
            <div className="flex gap-1">
              <FilterButton
                label="All Agents"
                active={agentFilter === 'all'}
                onClick={() => setAgentFilter('all')}
              />
              {AGENT_NAMES.map((id) => (
                <FilterButton
                  key={id}
                  label={id.charAt(0).toUpperCase() + id.slice(1)}
                  active={agentFilter === id}
                  onClick={() => setAgentFilter(id)}
                  color={id === 'nelson' ? '#60A5FA' : id === 'kitt' ? '#34D399' : '#A78BFA'}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} />
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Agent', 'Session Key', 'Model', 'Tokens', 'Messages', 'Last Active', ''].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${h === 'Tokens' || h === 'Messages' || h === 'Last Active' ? 'text-right' : 'text-left'}`}
                        style={{ color: '#64748B' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <SessionRow key={`${session.agentId}-${session.key}`} session={session} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center" style={{ color: '#475569' }}>
              <Activity size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
              <p>No sessions found</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

function FilterButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? (color ? `${color}22` : 'rgba(96,165,250,0.15)') : 'transparent',
        color: active ? (color || '#60A5FA') : '#64748B',
        border: `1px solid ${active ? (color ? `${color}44` : 'rgba(96,165,250,0.3)') : 'transparent'}`,
      }}
    >
      {label}
    </button>
  )
}
