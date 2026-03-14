'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, Cpu } from 'lucide-react'
import { Session, AgentName } from '@/lib/types'
import { Badge, AgentBadge } from '@/components/ui/Badge'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { estimateCost, AGENT_CONFIGS } from '@/config/agents'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

const AGENT_COLORS: Record<AgentName, string> = {
  nelson: '#60A5FA',
  kitt: '#34D399',
  paul: '#FBBF24',
  monty: '#F87171',
  archer: '#A78BFA',
  woodhouse: '#94A3B8',
  terry: '#FB923C',
  reacher: '#10B981',
}

function StatCard({ title, value, subtitle, color, icon: Icon }: {
  title: string
  value: string
  subtitle?: string
  color: string
  icon: React.ComponentType<{ size?: number; color?: string }>
}) {
  return (
    <div className="card" style={{ borderColor: `${color}33` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm" style={{ color: '#94A3B8' }}>{title}</p>
        <Icon size={16} color={color} />
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: '#64748B' }}>{subtitle}</p>}
    </div>
  )
}

export default function CostsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
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

  // Compute stats
  const totalTokens = sessions.reduce((sum, s) => sum + (s.tokenCount || 0), 0)
  const estimatedTotalCost = sessions.reduce((sum, s) => {
    const tokens = s.tokenCount || 0
    // Assume 70/30 input/output split
    return sum + estimateCost(s.model || 'default', tokens * 0.7, tokens * 0.3)
  }, 0)

  // By agent
  const byAgent = sessions.reduce<Record<string, { tokens: number; sessions: number; cost: number }>>((acc, s) => {
    if (!acc[s.agentId]) acc[s.agentId] = { tokens: 0, sessions: 0, cost: 0 }
    acc[s.agentId].tokens += s.tokenCount || 0
    acc[s.agentId].sessions += 1
    const t = s.tokenCount || 0
    acc[s.agentId].cost += estimateCost(s.model || 'default', t * 0.7, t * 0.3)
    return acc
  }, {})

  // By model
  const byModel = sessions.reduce<Record<string, { tokens: number; sessions: number }>>((acc, s) => {
    const model = s.model?.split('/').pop() || 'unknown'
    if (!acc[model]) acc[model] = { tokens: 0, sessions: 0 }
    acc[model].tokens += s.tokenCount || 0
    acc[model].sessions += 1
    return acc
  }, {})

  // Daily chart data
  const days = parseInt(period) || 30
  const dailyData = Array.from({ length: days }, (_, i) => {
    const day = subDays(new Date(), days - 1 - i)
    const dayStart = startOfDay(day).getTime()
    const dayEnd = dayStart + 86400000

    const daySessions = sessions.filter((s) => {
      const ts = s.lastActivity || s.createdAt || 0
      return ts >= dayStart && ts < dayEnd
    })

    const tokens = daySessions.reduce((sum, s) => sum + (s.tokenCount || 0), 0)
    const cost = daySessions.reduce((sum, s) => {
      const t = s.tokenCount || 0
      return sum + estimateCost(s.model || 'default', t * 0.7, t * 0.3)
    }, 0)

    const byAgentDay: Record<string, number> = {}
    for (const s of daySessions) {
      byAgentDay[s.agentId] = (byAgentDay[s.agentId] || 0) + (s.tokenCount || 0)
    }

    return {
      date: format(day, 'MMM d'),
      tokens,
      cost: parseFloat(cost.toFixed(4)),
      nelson: byAgentDay['nelson'] || 0,
      kitt: byAgentDay['kitt'] || 0,
      woodhouse: byAgentDay['woodhouse'] || 0,
    }
  })

  const pieData = Object.entries(byModel).map(([name, data]) => ({
    name,
    value: data.tokens,
  }))

  const PIE_COLORS = ['#60A5FA', '#34D399', '#A78BFA', '#FBBF24', '#F87171']

  const tooltipStyle = {
    background: '#1A1A2E',
    border: '1px solid #2A2A3E',
    borderRadius: 8,
    color: '#E2E8F0',
    fontSize: '0.75rem',
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign size={24} style={{ color: '#34D399' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>Cost Tracking</h1>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: period === p ? 'rgba(52,211,153,0.15)' : 'transparent',
                  color: period === p ? '#34D399' : '#64748B',
                  border: `1px solid ${period === p ? 'rgba(52,211,153,0.3)' : 'transparent'}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Tokens"
            value={totalTokens.toLocaleString()}
            subtitle="All time"
            color="#60A5FA"
            icon={TrendingUp}
          />
          <StatCard
            title="Estimated Cost"
            value={`$${estimatedTotalCost.toFixed(4)}`}
            subtitle="All time"
            color="#34D399"
            icon={DollarSign}
          />
          <StatCard
            title="Total Sessions"
            value={sessions.length.toLocaleString()}
            subtitle="All agents"
            color="#A78BFA"
            icon={Cpu}
          />
          <StatCard
            title="Avg Cost/Session"
            value={sessions.length > 0 ? `$${(estimatedTotalCost / sessions.length).toFixed(5)}` : '$0.00'}
            subtitle="Per session"
            color="#FBBF24"
            icon={DollarSign}
          />
        </div>

        {/* Token usage over time */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#E2E8F0' }}>
            Token Usage by Agent ({period})
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="nelson" stackId="1" stroke="#60A5FA" fill="#60A5FA33" name="Nelson" />
              <Area type="monotone" dataKey="kitt" stackId="1" stroke="#34D399" fill="#34D39933" name="Kitt" />
              <Area type="monotone" dataKey="woodhouse" stackId="1" stroke="#A78BFA" fill="#A78BFA33" name="Woodhouse" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost by day */}
          <div className="card">
            <h2 className="text-base font-semibold mb-4" style={{ color: '#E2E8F0' }}>
              Daily Cost ($)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(5)}`, 'Cost']} />
                <Bar dataKey="cost" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens by model */}
          <div className="card">
            <h2 className="text-base font-semibold mb-4" style={{ color: '#E2E8F0' }}>
              Tokens by Model
            </h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48" style={{ color: '#475569' }}>
                No model data available
              </div>
            )}
          </div>
        </div>

        {/* By agent breakdown */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#E2E8F0' }}>
            Per-Agent Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Agent', 'Sessions', 'Total Tokens', 'Est. Cost', 'Avg Tokens/Session'].map((h) => (
                    <th
                      key={h}
                      className={`py-2 px-4 text-xs font-semibold uppercase tracking-wide ${h === 'Agent' ? 'text-left' : 'text-right'}`}
                      style={{ color: '#64748B' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byAgent).map(([agentId, data]) => (
                  <tr
                    key={agentId}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="py-3 px-4">
                      <AgentBadge agentId={agentId as AgentName} agentName={agentId.charAt(0).toUpperCase() + agentId.slice(1)} />
                    </td>
                    <td className="py-3 px-4 text-right text-sm" style={{ color: '#E2E8F0' }}>{data.sessions}</td>
                    <td className="py-3 px-4 text-right text-sm" style={{ color: '#E2E8F0' }}>{data.tokens.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-sm" style={{ color: '#34D399' }}>${data.cost.toFixed(5)}</td>
                    <td className="py-3 px-4 text-right text-sm" style={{ color: '#94A3B8' }}>
                      {data.sessions > 0 ? Math.round(data.tokens / data.sessions).toLocaleString() : '0'}
                    </td>
                  </tr>
                ))}
                {Object.keys(byAgent).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm" style={{ color: '#475569' }}>
                      No cost data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
