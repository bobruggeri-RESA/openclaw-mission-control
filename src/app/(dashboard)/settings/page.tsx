'use client'

import { useState } from 'react'
import { Settings, Server, Key, RefreshCw, CheckCircle, XCircle, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AgentName } from '@/lib/types'
import { AGENT_CONFIGS, AGENT_NAMES } from '@/config/agents'

const AGENT_COLORS: Record<AgentName, string> = {
  nelson: '#60A5FA',
  kitt: '#34D399',
  paul: '#FBBF24',
  monty: '#F87171',
  archer: '#A78BFA',
  woodhouse: '#94A3B8',
  terry: '#FB923C',
}

const AGENT_URLS: Record<AgentName, string> = {
  nelson: 'http://192.168.7.6:18789',
  kitt: 'http://192.168.7.9:18789',
  paul: 'http://192.168.7.9:18789',
  monty: 'http://192.168.7.9:18789',
  archer: 'http://192.168.7.9:18789',
  woodhouse: 'http://192.168.7.11:18789',
  terry: 'http://192.168.7.6:18789',
}

function AgentConfigCard({ agentId }: { agentId: AgentName }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  const config = AGENT_CONFIGS[agentId]
  const color = AGENT_COLORS[agentId]

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, tool: 'session_status', args: {} }),
      })
      setTestResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${color}33`,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full" style={{ width: 10, height: 10, background: color }} />
          <h3 className="font-semibold" style={{ color: '#E2E8F0' }}>
            {config.displayName}
          </h3>
          <Badge variant="gray" size="sm" style={{ fontFamily: 'monospace' }}>
            {agentId}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {testResult === 'ok' && <CheckCircle size={16} color="#34D399" />}
          {testResult === 'fail' && <XCircle size={16} color="#F87171" />}
          <Button
            size="sm"
            variant="ghost"
            icon={<Wifi size={12} />}
            onClick={testConnection}
            loading={testing}
          >
            Test
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
            Gateway URL
          </label>
          <div
            className="px-3 py-2 rounded-lg font-mono text-sm"
            style={{ background: 'rgba(10,10,15,0.5)', border: '1px solid var(--border)', color: '#94A3B8' }}
          >
            {AGENT_URLS[agentId]}
          </div>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Set via {agentId.toUpperCase()}_GATEWAY_URL in .env.local
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
            Token
          </label>
          <div
            className="px-3 py-2 rounded-lg font-mono text-sm"
            style={{ background: 'rgba(10,10,15,0.5)', border: '1px solid var(--border)', color: '#475569' }}
          >
            ••••••••••••••••
          </div>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Set via {agentId.toUpperCase()}_GATEWAY_TOKEN in .env.local
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <Icon size={16} color="#60A5FA" />
        <h2 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [testingAll, setTestingAll] = useState(false)
  const [allResults, setAllResults] = useState<Record<string, boolean>>({})

  const testAllConnections = async () => {
    setTestingAll(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      const results: Record<string, boolean> = {}
      for (const [id, info] of Object.entries(data.agents || {})) {
        results[id] = (info as { online: boolean }).online
      }
      setAllResults(results)
    } finally {
      setTestingAll(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={24} style={{ color: '#60A5FA' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>Settings</h1>
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={testAllConnections}
            loading={testingAll}
          >
            Test All Connections
          </Button>
        </div>

        {Object.keys(allResults).length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>Connection Results</h3>
            <div className="flex gap-4">
              {Object.entries(allResults).map(([id, online]) => (
                <div key={id} className="flex items-center gap-2">
                  {online ? <CheckCircle size={14} color="#34D399" /> : <XCircle size={14} color="#F87171" />}
                  <span className="text-sm" style={{ color: online ? '#34D399' : '#F87171' }}>
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Section title="Agent Gateways" icon={Server}>
          <div className="grid grid-cols-1 gap-4">
            {AGENT_NAMES.map((id) => (
              <AgentConfigCard key={id} agentId={id} />
            ))}
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)' }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: '#60A5FA' }}>
              Configuration Note
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Gateway URLs and tokens are configured via environment variables in <code className="font-mono" style={{ color: '#94A3B8' }}>.env.local</code>.
              Restart the dev server after making changes.
            </p>
          </div>
        </Section>

        <Section title="Authentication" icon={Key}>
          <div className="card">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Admin Password</label>
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  Set via <code className="font-mono">ADMIN_PASSWORD</code> in .env.local
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Auth Secret</label>
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  Set via <code className="font-mono">AUTH_SECRET</code> in .env.local (min 32 chars)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Session Duration</label>
                <p className="text-sm" style={{ color: '#94A3B8' }}>7 days (JWT cookie)</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Dashboard" icon={Settings}>
          <div className="card space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Health Check Interval</label>
              <p className="text-sm" style={{ color: '#94A3B8' }}>30 seconds (hardcoded in TopBar)</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Feed Auto-refresh</label>
              <p className="text-sm" style={{ color: '#94A3B8' }}>30 seconds (toggle in Feed page)</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Theme</label>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Dark mode (fixed)</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Version</label>
              <p className="text-sm font-mono" style={{ color: '#94A3B8' }}>openclaw-mission-control v1.0.0</p>
            </div>
          </div>
        </Section>

        <Section title="Quick Links" icon={Server}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Nelson Gateway', url: 'http://127.0.0.1:18789' },
              { label: 'Kitt Gateway', url: 'http://192.168.7.9:18789' },
              { label: 'Woodhouse Gateway', url: 'http://192.168.7.11:18789' },
            ].map(({ label, url }) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg text-sm transition-colors"
                style={{
                  background: 'rgba(42,42,62,0.3)',
                  border: '1px solid var(--border)',
                  color: '#60A5FA',
                }}
              >
                {label}
                <span className="block text-xs mt-0.5" style={{ color: '#64748B' }}>{url}</span>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </ErrorBoundary>
  )
}
