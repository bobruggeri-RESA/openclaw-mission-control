import { NextRequest, NextResponse } from 'next/server'
import { invokeAll, safeInvoke } from '@/lib/openclaw'
import { AgentName, MemoryFile } from '@/lib/types'

interface WorkspaceFilesResult {
  files?: Array<{ path: string; name?: string; size?: number; modified?: number }>
}

interface FileReadResult {
  content?: string
  text?: string
}

interface MemorySearchResult {
  results?: Array<{ path: string; content: string; score?: number }>
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentFilter = searchParams.get('agent') as AgentName | null
  const filePath = searchParams.get('path')
  const query = searchParams.get('q')

  // Vector search across memories
  if (query) {
    const results = await invokeAll<MemorySearchResult>('memory_search', { query, limit: 20 })
    const searchResults = []
    for (const r of results) {
      if (r.error || !r.data) continue
      if (agentFilter && r.agentId !== agentFilter) continue
      const items = r.data.results || (Array.isArray(r.data) ? r.data as unknown[] : [])
      for (const item of items as Array<{ path: string; content: string; score?: number }>) {
        searchResults.push({ agentId: r.agentId, agentName: r.agentName, ...item })
      }
    }
    return NextResponse.json({ results: searchResults })
  }

  // Read a specific file
  if (filePath && agentFilter) {
    const { data, error } = await safeInvoke<FileReadResult>(
      agentFilter,
      'workspace_read',
      { path: filePath }
    )
    if (error) return NextResponse.json({ error }, { status: 500 })
    const content = data?.content || data?.text || (typeof data === 'string' ? data : '')
    return NextResponse.json({ content, path: filePath, agentId: agentFilter })
  }

  // List memory files for all agents
  const results = await invokeAll<WorkspaceFilesResult>('workspace_list', {
    pattern: '*.md',
    include_memory: true,
  })

  const memoryFiles: MemoryFile[] = []

  for (const result of results) {
    if (result.error || !result.data) continue
    if (agentFilter && result.agentId !== agentFilter) continue

    const files = result.data.files || (Array.isArray(result.data) ? result.data as unknown[] : [])
    for (const f of files as Array<{ path: string; name?: string; size?: number; modified?: number }>) {
      const name = f.name || f.path.split('/').pop() || f.path
      if (name.endsWith('.md')) {
        memoryFiles.push({
          agentId: result.agentId as AgentName,
          agentName: result.agentName,
          path: f.path,
          name,
          content: '',
          updatedAt: f.modified,
        })
      }
    }
  }

  return NextResponse.json({ files: memoryFiles, timestamp: Date.now() })
}

export async function PUT(request: NextRequest) {
  const { agentId, path, content } = await request.json()

  if (!agentId || !path || content === undefined) {
    return NextResponse.json({ error: 'agentId, path, and content required' }, { status: 400 })
  }

  const { data, error } = await safeInvoke(agentId as AgentName, 'workspace_write', {
    path,
    content,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
