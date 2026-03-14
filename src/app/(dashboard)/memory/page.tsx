'use client'

import { useState, useEffect, useCallback } from 'react'
import { Brain, Search, Save, RefreshCw, FileText, Edit3 } from 'lucide-react'
import { MemoryFile, AgentName } from '@/lib/types'
import { AgentBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AGENT_NAMES } from '@/config/agents'

function MemoryFileItem({
  file,
  selected,
  onClick,
}: {
  file: MemoryFile
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
      style={{
        background: selected ? 'rgba(96,165,250,0.1)' : 'transparent',
        border: `1px solid ${selected ? 'rgba(96,165,250,0.3)' : 'transparent'}`,
      }}
    >
      <FileText size={14} style={{ color: selected ? '#60A5FA' : '#64748B', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: selected ? '#E2E8F0' : '#94A3B8' }}>
          {file.name}
        </p>
        <AgentBadge agentId={file.agentId} agentName={file.agentName} />
      </div>
    </button>
  )
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div
      className="prose prose-invert max-w-none p-4 rounded-lg overflow-auto"
      style={{ background: 'rgba(10,10,15,0.5)', maxHeight: '60vh' }}
    >
      <pre className="whitespace-pre-wrap text-sm" style={{ color: '#94A3B8', fontFamily: 'inherit' }}>
        {content}
      </pre>
    </div>
  )
}

function MemoryEditor({
  file,
  content,
  onSave,
  onCancel,
}: {
  file: MemoryFile
  content: string
  onSave: (newContent: string) => Promise<void>
  onCancel: () => void
}) {
  const [editContent, setEditContent] = useState(content)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(editContent)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        className="w-full font-mono text-sm rounded-lg p-4 resize-y"
        style={{
          background: 'rgba(10,10,15,0.6)',
          border: '1px solid rgba(96,165,250,0.3)',
          color: '#E2E8F0',
          minHeight: '50vh',
        }}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          icon={<Save size={14} />}
          onClick={handleSave}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [editing, setEditing] = useState(false)
  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ agentId: AgentName; agentName: string; path: string; content: string; score?: number }>>([])
  const [searching, setSearching] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/memory')
      const data = await res.json()
      setFiles(data.files || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const loadFileContent = async (file: MemoryFile) => {
    setSelectedFile(file)
    setEditing(false)
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/memory?path=${encodeURIComponent(file.path)}&agent=${file.agentId}`)
      const data = await res.json()
      setFileContent(data.content || '')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const url = `/api/memory?q=${encodeURIComponent(searchQuery)}${agentFilter !== 'all' ? `&agent=${agentFilter}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setSearchResults(data.results || [])
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async (newContent: string) => {
    if (!selectedFile) return
    try {
      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedFile.agentId,
          path: selectedFile.path,
          content: newContent,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setFileContent(newContent)
      setEditing(false)
      setSaveStatus('Saved!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      setSaveStatus('Save failed')
    }
  }

  const filteredFiles = files.filter((f) => {
    if (agentFilter !== 'all' && f.agentId !== agentFilter) return false
    return true
  })

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain size={24} style={{ color: '#A78BFA' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
            Memory Browser
          </h1>
          <Badge variant="purple">{files.length} files</Badge>
        </div>

        {/* Search */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>
            Vector Search
          </h2>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search across all agent memories..."
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(10,10,15,0.5)',
                border: '1px solid var(--border)',
                color: '#E2E8F0',
              }}
            />
            <Button
              variant="secondary"
              icon={<Search size={14} />}
              onClick={handleSearch}
              loading={searching}
            >
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AgentBadge agentId={r.agentId} agentName={r.agentName} />
                    <span className="text-xs font-mono" style={{ color: '#64748B' }}>{r.path}</span>
                    {r.score !== undefined && (
                      <span className="text-xs" style={{ color: '#A78BFA' }}>
                        {(r.score * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>
                    {r.content?.slice(0, 200)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File list */}
          <div
            className="rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: '#94A3B8' }}>Files</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setAgentFilter('all')}
                  className="px-2 py-1 rounded text-xs"
                  style={{ color: agentFilter === 'all' ? '#60A5FA' : '#64748B' }}
                >All</button>
                {AGENT_NAMES.map((id) => (
                  <button
                    key={id}
                    onClick={() => setAgentFilter(id)}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      color: agentFilter === id
                        ? (id === 'nelson' ? '#60A5FA' : id === 'kitt' ? '#34D399' : '#A78BFA')
                        : '#64748B'
                    }}
                  >
                    {id[0].toUpperCase() + id.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              {loading ? (
                <div className="space-y-1 p-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 skeleton rounded" />
                  ))}
                </div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map((file, i) => (
                  <MemoryFileItem
                    key={`${file.agentId}-${file.path}-${i}`}
                    file={file}
                    selected={selectedFile?.path === file.path && selectedFile?.agentId === file.agentId}
                    onClick={() => loadFileContent(file)}
                  />
                ))
              ) : (
                <p className="text-sm text-center py-8" style={{ color: '#475569' }}>
                  No memory files found
                </p>
              )}
            </div>
          </div>

          {/* Content viewer/editor */}
          <div
            className="lg:col-span-2 rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {selectedFile ? (
              <>
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: '#A78BFA' }} />
                    <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
                      {selectedFile.name}
                    </span>
                    <AgentBadge agentId={selectedFile.agentId} agentName={selectedFile.agentName} />
                  </div>
                  <div className="flex items-center gap-2">
                    {saveStatus && (
                      <span className="text-xs" style={{ color: saveStatus.includes('failed') ? '#F87171' : '#34D399' }}>
                        {saveStatus}
                      </span>
                    )}
                    {!editing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit3 size={12} />}
                        onClick={() => setEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {loadingContent ? (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                      ))}
                    </div>
                  ) : editing ? (
                    <MemoryEditor
                      file={selectedFile}
                      content={fileContent}
                      onSave={handleSave}
                      onCancel={() => setEditing(false)}
                    />
                  ) : (
                    <MarkdownViewer content={fileContent} />
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full py-20">
                <div className="text-center" style={{ color: '#475569' }}>
                  <FileText size={40} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
                  <p>Select a file to view its contents</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
