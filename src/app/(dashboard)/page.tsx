'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, Users, Clock, Zap, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import { AgentStatus, Session, CronJob, ActivityItem } from '@/lib/types'
import { Badge, AgentBadge, StatusBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { formatDistanceToNow } from 'date-fns'
import { AGENT_CONFIGS } from '@/config/agents'

const AGENT_COLORS: Record<string, string> = {
  nelson: '#60A5FA',
  kitt: '#34D399',
  woodhouse: '#A78BFA',
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  subtitle?: string
}) {
  return (
    <div
      className="card animate-fade-in"
      style={{ borderColor: `${color}33` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>
          {title}
        </p>
        <div
          className="p-2 rounded-lg"
          style={{ background: `${color}1A` }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs mt-1" style={{ color: '#64748B' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const color = AGENT_COLORS[agent.agentId] || '#94A3B8'

  return (
    <div
      className="card transition-all animate-fade-in"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="rounded-full"
            style={{
              width: 10,
              height: 10,
              background: agent.online ? color : '#F87171',
              boxShadow: agent.online ? `0 0 8px ${color}` : 'none',
            }}
          />
          <h3 className="font-semibold text-base" style={{ color: '#E2E8F0' }}>
            {agent.agentName}
          </h3>
        </div>
        <StatusBadge online={agent.online} />
      </div>

      {agent.online ? (
        <div className="space-y-2">
          {agent.model && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#64748B' }}>Model</span>
              <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {agent.model.split('/').pop()}
              </span>
            </div>
          )}
          {agent.sessionCount !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#64748B' }}>Sessions</span>
              <span style={{ color: '#E2E8F0' }}>{agent.sessionCount}</span>
            </div>
          )}
          {agent.uptime !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#64748B' }}>Uptime</span>
              <span style={{ color: '#E2E8F0' }}>
                {Math.floor(agent.uptime / 3600)}h {Math.floor((agent.uptime % 3600) / 60)}m
              </span>
            </div>
          )}
          {agent.channels && agent.channels.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#64748B' }}>Channels</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {agent.channels.slice(0, 3).map((ch) => (
                  <Badge key={ch} variant="gray" size="sm">{ch}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm" style={{ color: '#64748B' }}>
          <AlertCircle size={14} />
          {agent.error || 'Gateway unreachable'}
        </div>
      )}
    </div>
  )
}

function ActivityFeedItem({ item }: { item: ActivityItem }) {
  const typeConfig = {
    tool: { color: '#60A5FA', label: 'Tool' },
    assistant: { color: '#A78BFA', label: 'Assistant' },
    user: { color: '#34D399', label: 'User' },
    system: { color: '#FBBF24', label: 'System' },
    cron: { color: '#F87171', label: 'Cron' },
  }

  const config = typeConfig[item.type] || typeConfig.system

  return (
    <div className="flex gap-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="rounded-full"
          style={{ width: 8, height: 8, background: config.color, boxShadow: `0 0 4px ${config.color}` }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <AgentBadge agentId={item.agentId} agentName={item.agentName} />
          <Badge variant="gray" size="sm">{config.label}</Badge>
          {item.toolName && (
            <span className="text-xs font-mono" style={{ color: '#60A5FA' }}>{item.toolName}</span>
          )}
        </div>
        <p className="text-sm truncate" style={{ color: '#94A3B8' }}>
          {item.content}
        </p>
      </div>
      <div className="flex-shrink-0 text-xs" style={{ color: '#475569' }}>
        {item.timestamp
          ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
          : '—'}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, sessionsRes, cronRes] = await Promise.allSettled([
        fetch('/api/agents').then((r) => r.json()),
        fetch('/api/sessions').then((r) => r.json()),
        fetch('/api/cron').then((r) => r.json()),
      ])

      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value.agents || [])
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.sessions || [])
      if (cronRes.status === 'fulfilled') setCronJobs(cronRes.value.jobs || [])
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Build activity feed from sessions
  const activityItems: ActivityItem[] = sessions
    .slice(0, 20)
    .map((s, i) => ({
      id: `${s.key}-${i}`,
      agentId: s.agentId,
      agentName: s.agentName,
      type: 'user' as const,
      content: s.label || `Session ${s.key?.slice(-8) || 'unknown'}`,
      timestamp: s.lastActivity || Date.now(),
      sessionKey: s.key,
      model: s.model,
    }))

  const onlineAgents = agents.filter((a) => a.online).length
  const totalTokens = sessions.reduce((sum, s) => sum + (s.tokenCount || 0), 0)
  const activeCrons = cronJobs.filter((j) => j.enabled).length

  // Sessions today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sessionsToday = sessions.filter(
    (s) => s.createdAt && s.createdAt > today.getTime()
  ).length

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
              Mission Control
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {onlineAgents}/{agents.length} agents online
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: 'rgba(96,165,250,0.1)',
              color: '#60A5FA',
              border: '1px solid rgba(96,165,250,0.2)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : `Refreshed ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Agents Online"
            value={`${onlineAgents}/${agents.length}`}
            icon={Users}
            color="#34D399"
            subtitle="Multi-agent system"
          />
          <StatCard
            title="Sessions Today"
            value={sessionsToday}
            icon={Activity}
            color="#60A5FA"
            subtitle={`${sessions.length} total sessions`}
          />
          <StatCard
            title="Tokens Used"
            value={totalTokens.toLocaleString()}
            icon={TrendingUp}
            color="#A78BFA"
            subtitle="Across all agents"
          />
          <StatCard
            title="Active Crons"
            value={activeCrons}
            icon={Clock}
            color="#FBBF24"
            subtitle={`${cronJobs.length} total jobs`}
          />
        </div>

        {/* Agent Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: '#E2E8F0' }}>
            Agent Status
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))}
              {agents.length === 0 && (
                <div className="col-span-3 card text-center py-12" style={{ color: '#64748B' }}>
                  <Zap size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
                  <p>No agent data available. Check your gateway connections.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>
                Recent Sessions
              </h2>
              <Activity size={16} style={{ color: '#64748B' }} />
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 skeleton rounded" />
                ))}
              </div>
            ) : activityItems.length > 0 ? (
              <div>
                {activityItems.slice(0, 10).map((item) => (
                  <ActivityFeedItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#475569' }}>
                No recent activity
              </p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>
                Cron Jobs
              </h2>
              <Clock size={16} style={{ color: '#64748B' }} />
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 skeleton rounded" />
                ))}
              </div>
            ) : cronJobs.length > 0 ? (
              <div className="space-y-2">
                {cronJobs.slice(0, 10).map((job) => (
                  <div
                    key={`${job.agentId}-${job.id}`}
                    className="flex items-center justify-between py-2 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: job.enabled ? '#34D399' : '#64748B',
                        }}
                      />
                      <span className="text-sm" style={{ color: '#E2E8F0' }}>
                        {job.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono"
                        style={{ color: '#64748B' }}
                      >
                        {job.schedule.expr}
                      </span>
                      <AgentBadge agentId={job.agentId} agentName={job.agentName} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#475569' }}>
                No cron jobs configured
              </p>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
