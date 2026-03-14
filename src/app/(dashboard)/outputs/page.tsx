'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, RefreshCw, Filter, Search, FolderOpen } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Badge } from '@/components/ui/Badge'
import { AgentName } from '@/lib/types'
import { AGENT_CONFIGS, AGENT_NAMES } from '@/config/agents'
import { formatDistanceToNow } from 'date-fns'

interface OutputFile {
  name: string
  path: string
  agentId: AgentName
  agentName: string
  ext: string
  sizeKb: number
  modifiedAt: number
  source: 'local' | 'remote'
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
  '.json': '#FBBF24',
  '.pdf': '#F87171',
  '.docx': '#34D399',
  '.csv': '#A78BFA',
  '.html': '#FB923C',
}

const EXT_LABELS: Record<string, string> = {
  '.md': 'Markdown',
  '.txt': 'Text',
  '.json': 'JSON',
  '.pdf': 'PDF',
  '.docx': 'Word',
  '.csv': 'CSV',
  '.html': 'HTML',
}

function FileRow({ file }: { file: OutputFile }) {
  const color = AGENT_COLORS[file.agentId] || '#94A3B8'
  const extColor = EXT_COLORS[file.ext] || '#94A3B8'
  const isLocal = file.source === 'local'

  const handleDownload = () => {
    if (isLocal) {
      window.open(`/api/outputs/download?agent=${file.agentId}&path=${encodeURIComponent(file.path)}`, '_blank')
    } else {
      // Remote files — show path for now
      alert(`Remote file: ${file.path}\nDownload via: \\\\Nelson\\...\\${file.path}`)
    }
  }

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 rounded-lg transition-all hover:opacity-90"
      style={{ background: 'rgba(10,10,15,0.4)', border: '1px solid var(--border)' }}
    >
      {/* File type icon */}
      <div
        className="flex items-center justify-center rounded text-xs font-bold shrink-0"
        style={{ width: 36, height: 36, background: `${extColor}20`, color: extColor, border: `1px solid ${extColor}40` }}
      >
        {file.ext.replace('.', '').toUpperCase()}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>
            {file.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            {file.agentName}
          </span>
          {file.source === 'remote' && (
            <Badge variant="gray" size="sm">remote</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs truncate" style={{ color: '#475569' }}>
            {file.path}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-xs" style={{ color: '#64748B' }}>
            {file.modifiedAt
              ? formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })
              : '—'}
          </div>
          <div className="text-xs" style={{ color: '#475569' }}>
            {file.sizeKb > 0 ? `${file.sizeKb} KB` : '< 1 KB'}
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: isLocal ? 'rgba(96,165,250,0.1)' : 'rgba(100,116,139,0.1)',
            color: isLocal ? '#60A5FA' : '#64748B',
            border: `1px solid ${isLocal ? 'rgba(96,165,250,0.2)' : 'rgba(100,116,139,0.2)'}`,
          }}
          title={isLocal ? 'Download' : 'Remote file — path shown'}
        >
          <Download size={12} />
          {isLocal ? 'Download' : 'Path'}
        </button>
      </div>
    </div>
  )
}

function OutputsContent() {
  const [files, setFiles] = useState<OutputFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all')
  const [extFilter, setExtFilter] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (agentFilter !== 'all') params.set('agent', agentFilter)
      if (extFilter !== 'all') params.set('ext', extFilter.replace('.', ''))
      const res = await fetch(`/api/outputs?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFiles(data.files || [])
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [agentFilter, extFilter])

  useEffect(() => { load() }, [load])

  const filtered = files.filter(f => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q) ||
      f.agentName.toLowerCase().includes(q)
  })

  // Group by agent
  const byAgent = filtered.reduce<Record<string, OutputFile[]>>((acc, f) => {
    if (!acc[f.agentName]) acc[f.agentName] = []
    acc[f.agentName].push(f)
    return acc
  }, {})

  const allExts = [...new Set(files.map(f => f.ext))].sort()

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: '#E2E8F0',
              outline: 'none',
            }}
          />
        </div>

        {/* Agent filter */}
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value as AgentName | 'all')}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#E2E8F0' }}
        >
          <option value="all">All Agents</option>
          {AGENT_NAMES.map(id => (
            <option key={id} value={id}>{AGENT_CONFIGS[id].displayName}</option>
          ))}
        </select>

        {/* Ext filter */}
        <select
          value={extFilter}
          onChange={e => setExtFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#E2E8F0' }}
        >
          <option value="all">All Types</option>
          {allExts.map(ext => (
            <option key={ext} value={ext}>{EXT_LABELS[ext] || ext}</option>
          ))}
        </select>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm" style={{ color: '#64748B' }}>
        <span><span style={{ color: '#E2E8F0' }}>{filtered.length}</span> files</span>
        <span><span style={{ color: '#E2E8F0' }}>{Object.keys(byAgent).length}</span> agents</span>
        <span>Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#F8717133' }}>
          <p style={{ color: '#F87171' }}>Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16" style={{ color: '#64748B' }}>
          <FolderOpen size={40} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p>No files found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byAgent).map(([agentName, agentFiles]) => {
            const agentId = agentFiles[0]?.agentId
            const color = agentId ? AGENT_COLORS[agentId] : '#94A3B8'
            const config = agentId ? AGENT_CONFIGS[agentId] : null
            return (
              <div key={agentName}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{config?.emoji || '🤖'}</span>
                  <h3 className="font-semibold" style={{ color }}>
                    {agentName}
                  </h3>
                  <Badge variant="gray" size="sm">{agentFiles.length} files</Badge>
                </div>
                <div className="space-y-2">
                  {agentFiles.map((f, i) => (
                    <FileRow key={`${f.agentId}-${f.path}-${i}`} file={f} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OutputsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText size={22} color="#60A5FA" />
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E2E8F0' }}>Outputs</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Documents and files created by all agents — searchable and downloadable
          </p>
        </div>
      </div>

      <ErrorBoundary>
        <OutputsContent />
      </ErrorBoundary>
    </div>
  )
}
