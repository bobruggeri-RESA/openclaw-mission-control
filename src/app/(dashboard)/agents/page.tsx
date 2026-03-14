'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, ChevronDown, ChevronUp, Cpu, Activity, Clock, Radio, FileText } from 'lucide-react'
import { AgentStatus, AgentName } from '@/lib/types'
import { Badge, AgentBadge, StatusBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AGENT_CONFIGS, AGENT_NAMES } from '@/config/agents'
import { formatDistanceToNow } from 'date-fns'

const AGENT_COLORS: Record<AgentName, string> = {
  nelson: '#60A5FA',
  kitt: '#34D399',
  woodhouse: '#A78BFA',
}

function AgentDetailCard({ agent }: { agent: AgentStatus }) {
  const [expanded, setExpanded] = useState(false)
  const color = AGENT_COLORS[agent.agentId]
  const config = AGENT_CONFIGS[agent.agentId]

  return (
    <div
      className="rounded-xl overflow-hidden transition-all animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${color}44`,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 48,
                height: 48,
                background: `${color}1A`,
                border: `1px solid ${color}33`,
              }}
            >
              <Cpu size={22} color={color} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: '#E2E8F0' }}>
                {agent.agentName}
              </h3>
              <p className="text-sm" style={{ color: '#64748B' }}>
                {config ? `${agent.agentId}.openclaw.local` : ''}
              </p>
            </div>
          </div>
          <StatusBadge online={agent.online} />
        </div>

        {agent.online ? (
          <div className="grid grid-cols-2 gap-3">
            <MetricItem
              icon={<Cpu size={14} />}
              label="Model"
              value={agent.model?.split('/').pop() || '—'}
            />
            <MetricItem
              icon={<Activity size={14} />}
              label="Sessions"
              value={agent.sessionCount?.toString() || '0'}
            />
            <MetricItem
              icon={<Clock size={14} />}
              label="Uptime"
              value={
                agent.uptime !== undefined
                  ? `${Math.floor(agent.uptime / 3600)}h ${Math.floor((agent.uptime % 3600) / 60)}m`
                  : '—'
              }
            />
            <MetricItem
              icon={<Activity size={14} />}
              label="Tokens"
              value={agent.tokenUsage?.toLocaleString() || '0'}
            />
            {agent.lastSeen && (
              <MetricItem
                icon={<Clock size={14} />}
                label="Last Seen"
                value={formatDistanceToNow(new Date(agent.lastSeen), { addSuffix: true })}
              />
            )}
            {agent.version && (
              <MetricItem
                icon={<FileText size={14} />}
                label="Version"
                value={agent.version}
              />
            )}
          </div>
        ) : (
          <div
            className="p-3 rounded-lg text-sm"
            style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171' }}
          >
            {agent.error || 'Gateway unreachable. Check network connectivity.'}
          </div>
        )}

        {agent.online && agent.channels && agent.channels.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Radio size={12} style={{ color: '#64748B' }} />
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                Connected Channels
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agent.channels.map((ch) => (
                <Badge key={ch} variant="gray" size="sm">{ch}</Badge>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm transition-colors w-full justify-center py-1.5 rounded-lg"
          style={{
            color: '#64748B',
            background: 'rgba(42,42,62,0.3)',
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {expanded && (
        <AgentExpandedDetails agentId={agent.agentId} color={color} />
      )}
    </div>
  )
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="p-2.5 rounded-lg"
      style={{ background: 'rgba(10,10,15,0.4)' }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: '#64748B' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>
        {value}
      </p>
    </div>
  )
}

function AgentExpandedDetails({ agentId, color }: { agentId: AgentName; color: string }) {
  const [sessions, setSessions] = useState<Array<{ key: string; model?: string; tokenCount?: number; lastActivity?: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions?agent=${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  return (
    <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(10,10,15,0.3)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>
        Recent Sessions
      </h4>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 skeleton rounded" />
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-1">
          {sessions.slice(0, 10).map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2 rounded-lg text-sm"
              style={{ background: 'rgba(42,42,62,0.2)' }}
            >
              <span className="font-mono text-xs" style={{ color: '#64748B' }}>
                {s.key?.slice(-12) || 'unknown'}
              </span>
              <div className="flex items-center gap-2">
                {s.model && (
                  <span className="text-xs" style={{ color: '#64748B' }}>
                    {s.model.split('/').pop()}
                  </span>
                )}
                {s.tokenCount !== undefined && (
                  <span className="text-xs" style={{ color: color }}>
                    {s.tokenCount.toLocaleString()} tok
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: '#475569' }}>No sessions found</p>
      )}
    </div>
  )
}

function OrgChart({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="card">
      <h2 className="text-base font-semibold mb-4" style={{ color: '#E2E8F0' }}>
        Agent Hierarchy
      </h2>
      <div className="flex flex-col items-center gap-4 py-4">
        {/* Main node - Nelson */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{
            background: 'rgba(96,165,250,0.15)',
            border: '1px solid rgba(96,165,250,0.3)',
            color: '#60A5FA',
          }}
        >
          <div className="rounded-full" style={{ width: 8, height: 8, background: '#60A5FA' }} />
          Nelson (Main Agent)
        </div>

        {/* Connector */}
        <div style={{ width: 2, height: 24, background: 'var(--border)' }} />

        {/* Sub-agents */}
        <div className="flex items-start gap-8">
          {agents
            .filter((a) => a.agentId !== 'nelson')
            .map((agent, i, arr) => {
              const color = AGENT_COLORS[agent.agentId]
              return (
                <div key={agent.agentId} className="flex flex-col items-center gap-2 relative">
                  {/* Horizontal line connector */}
                  {arr.length > 1 && (
                    <div
                      className="absolute"
                      style={{
                        top: -24,
                        left: i === 0 ? '50%' : 0,
                        right: i === arr.length - 1 ? '50%' : 0,
                        height: 2,
                        background: 'var(--border)',
                      }}
                    />
                  )}
                  <div
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{
                      background: `${color}1A`,
                      border: `1px solid ${color}33`,
                      color,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: agent.online ? color : '#F87171',
                        }}
                      />
                      {agent.agentName}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: '#475569' }}>
                    {agent.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data.agents || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users size={24} style={{ color: '#60A5FA' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
            Agents
          </h1>
          <Badge variant="blue">{agents.filter((a) => a.online).length}/{agents.length} Online</Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <AgentDetailCard key={agent.agentId} agent={agent} />
              ))}
              {agents.length === 0 && (
                <div className="col-span-3 card text-center py-12" style={{ color: '#64748B' }}>
                  No agents available
                </div>
              )}
            </div>

            {agents.length > 0 && <OrgChart agents={agents} />}
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
