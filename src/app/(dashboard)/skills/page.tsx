'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Layers, Share2, RefreshCw, FileText,
  Package, Globe, HardDrive, ChevronDown, ChevronUp
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Badge } from '@/components/ui/Badge'
import { AGENT_CONFIGS, AGENT_NAMES, HOST_CONFIGS } from '@/config/agents'
import { AgentName } from '@/lib/types'

interface SkillInfo {
  name: string
  description?: string
  version?: string
  author?: string
}

interface KnowledgeInfo {
  name: string
  ext: string
  sizeKb: number
}

interface SkillsData {
  shared: {
    skills: SkillInfo[]
    knowledge: KnowledgeInfo[]
  }
  builtin: {
    skills: SkillInfo[]
  }
  summary: {
    sharedSkillsCount: number
    sharedKnowledgeCount: number
    builtinSkillsCount: number
    totalSkillsCount: number
  }
}

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

const EXT_COLORS: Record<string, string> = {
  '.md': '#60A5FA',
  '.txt': '#94A3B8',
  '.docx': '#34D399',
  '.pdf': '#F87171',
  '.json': '#FBBF24',
}

function StatCard({
  icon: Icon, label, value, sublabel, color,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: number | string
  sublabel?: string
  color: string
}) {
  return (
    <div
      className="card animate-fade-in"
      style={{ borderColor: `${color}33`, borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36, background: `${color}20` }}
        >
          <Icon size={18} color={color} />
        </div>
        <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>{label}</span>
      </div>
      <div className="text-3xl font-bold" style={{ color: '#E2E8F0' }}>{value}</div>
      {sublabel && (
        <div className="text-xs mt-1" style={{ color: '#64748B' }}>{sublabel}</div>
      )}
    </div>
  )
}

function SkillRow({ skill, shared }: { skill: SkillInfo; shared?: boolean }) {
  return (
    <div
      className="flex items-start justify-between gap-3 py-2 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
            {skill.name}
          </span>
          {skill.version && (
            <Badge variant="gray" size="sm">{skill.version}</Badge>
          )}
          {shared && (
            <Badge variant="blue" size="sm">shared</Badge>
          )}
        </div>
        {skill.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
            {skill.description}
          </p>
        )}
      </div>
      {skill.author && (
        <span className="text-xs shrink-0" style={{ color: '#475569' }}>{skill.author}</span>
      )}
    </div>
  )
}

function KnowledgeRow({ article }: { article: KnowledgeInfo }) {
  const color = EXT_COLORS[article.ext] || '#94A3B8'
  return (
    <div
      className="flex items-center justify-between gap-3 py-2 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={14} color={color} className="shrink-0" />
        <span className="text-sm truncate" style={{ color: '#E2E8F0' }}>{article.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge size="sm" style={{ background: `${color}20`, color }}>
          {article.ext.replace('.', '')}
        </Badge>
        <span className="text-xs" style={{ color: '#64748B' }}>{article.sizeKb} KB</span>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title, count, color, icon: Icon, children,
}: {
  title: string
  count: number
  color: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} color={color} />
          <span className="font-semibold" style={{ color: '#E2E8F0' }}>{title}</span>
          <Badge variant="gray" size="sm">{count}</Badge>
        </div>
        {open ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

function AgentSkillsSummary() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Share2 size={16} color="#60A5FA" />
        <h3 className="font-semibold" style={{ color: '#E2E8F0' }}>Agent Access</h3>
      </div>
      <p className="text-sm mb-4" style={{ color: '#64748B' }}>
        All agents have access to shared skills and knowledge via{' '}
        <code className="text-xs px-1 rounded" style={{ background: '#1A1A2E', color: '#60A5FA' }}>
          \\Nelson\OpenClawSkills
        </code>{' '}
        and{' '}
        <code className="text-xs px-1 rounded" style={{ background: '#1A1A2E', color: '#60A5FA' }}>
          \\Nelson\OpenClawKnowledge
        </code>
      </p>

      {/* Host groupings */}
      <div className="space-y-3">
        {(Object.keys(HOST_CONFIGS) as Array<keyof typeof HOST_CONFIGS>).map((hostId) => {
          const host = HOST_CONFIGS[hostId]
          return (
            <div
              key={hostId}
              className="rounded-lg p-3"
              style={{ background: 'rgba(10,10,15,0.5)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={13} color="#94A3B8" />
                <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>
                  {host.displayName} host
                  <span className="ml-1 text-xs" style={{ color: '#475569' }}>({host.ip})</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {host.agents.map((agentId) => {
                  const agent = AGENT_CONFIGS[agentId]
                  return (
                    <span
                      key={agentId}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${AGENT_COLORS[agentId]}20`,
                        color: AGENT_COLORS[agentId],
                        border: `1px solid ${AGENT_COLORS[agentId]}40`,
                      }}
                    >
                      {agent.emoji} {agent.displayName}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillsContent() {
  const [data, setData] = useState<SkillsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/skills')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )

  if (error) return (
    <div className="card" style={{ borderColor: '#F8717133' }}>
      <p style={{ color: '#F87171' }}>Error: {error}</p>
      <button onClick={load} className="mt-2 text-sm" style={{ color: '#60A5FA' }}>Retry</button>
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Skills"
          value={data.summary.totalSkillsCount}
          sublabel="shared + built-in"
          color="#60A5FA"
        />
        <StatCard
          icon={Share2}
          label="Shared Skills"
          value={data.summary.sharedSkillsCount}
          sublabel="\\Nelson\OpenClawSkills"
          color="#34D399"
        />
        <StatCard
          icon={Package}
          label="Built-in Skills"
          value={data.summary.builtinSkillsCount}
          sublabel="openclaw core"
          color="#A78BFA"
        />
        <StatCard
          icon={BookOpen}
          label="Knowledge Articles"
          value={data.summary.sharedKnowledgeCount}
          sublabel="\\Nelson\OpenClawKnowledge"
          color="#FBBF24"
        />
      </div>

      {/* Agent access map */}
      <AgentSkillsSummary />

      {/* Shared skills list */}
      <CollapsibleSection
        title="Shared Skills"
        count={data.summary.sharedSkillsCount}
        color="#34D399"
        icon={Share2}
      >
        <div className="max-h-80 overflow-y-auto">
          {data.shared.skills.map((s) => (
            <SkillRow key={s.name} skill={s} shared />
          ))}
        </div>
      </CollapsibleSection>

      {/* Knowledge base */}
      <CollapsibleSection
        title="Shared Knowledge Base"
        count={data.summary.sharedKnowledgeCount}
        color="#FBBF24"
        icon={BookOpen}
      >
        <div className="max-h-80 overflow-y-auto">
          {data.shared.knowledge.map((a) => (
            <KnowledgeRow key={a.name} article={a} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Built-in skills */}
      <CollapsibleSection
        title="Built-in Skills (OpenClaw Core)"
        count={data.summary.builtinSkillsCount}
        color="#A78BFA"
        icon={Package}
      >
        <div className="max-h-80 overflow-y-auto">
          {data.builtin.skills.map((s) => (
            <SkillRow key={s.name} skill={s} />
          ))}
        </div>
      </CollapsibleSection>

      <p className="text-xs" style={{ color: '#334155' }}>
        Last refreshed: {lastRefresh.toLocaleTimeString()}
      </p>
    </div>
  )
}

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={22} color="#60A5FA" />
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#E2E8F0' }}>Skills & Knowledge</h1>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Shared resources available to all agents
            </p>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <SkillsContent />
      </ErrorBoundary>
    </div>
  )
}
