import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { AgentName } from '@/lib/types'

export interface OutputFile {
  name: string
  path: string
  agentId: AgentName
  agentName: string
  ext: string
  sizeKb: number
  modifiedAt: number
  source: 'local' | 'remote'
}

// Workspace paths local to Kitt (the host running this app)
const LOCAL_WORKSPACES: Array<{ agentId: AgentName; agentName: string; dir: string }> = [
  { agentId: 'kitt', agentName: 'Kitt', dir: 'C:\\Users\\Bob\\.openclaw\\workspace' },
  { agentId: 'paul', agentName: 'Paul', dir: 'C:\\Users\\Bob\\.openclaw\\workspace-paul' },
  { agentId: 'monty', agentName: 'Monty', dir: 'C:\\Users\\Bob\\.openclaw\\workspace-monty' },
  { agentId: 'archer', agentName: 'Archer', dir: 'C:\\Users\\Bob\\.openclaw\\workspace-archer' },
]

// Workspace paths on Nelson — fetched via gateway
const NELSON_GATEWAY_URL = process.env.NELSON_GATEWAY_URL || ''
const NELSON_TOKEN = process.env.NELSON_GATEWAY_TOKEN || ''

const NELSON_WORKSPACES: Array<{ agentId: AgentName; agentName: string; dir: string }> = [
  { agentId: 'nelson', agentName: 'Nelson', dir: 'C:\\Users\\Bob\\.openclaw\\workspace' },
  { agentId: 'terry', agentName: 'Terry', dir: 'C:\\Users\\Bob\\.openclaw\\workspace-terry' },
  { agentId: 'reacher', agentName: 'Reacher', dir: 'C:\\Users\\Bob\\.openclaw\\workspace-reacher' },
]

const ALLOWED_EXTS = ['.md', '.txt', '.json', '.pdf', '.docx', '.csv', '.html']
const EXCLUDED_FILES = new Set(['AGENTS.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'TOOLS.md'])
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.next', 'tmp'])

function scanDir(dir: string, base: string, agentId: AgentName, agentName: string): OutputFile[] {
  const results: OutputFile[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      const relPath = path.relative(base, fullPath)

      if (entry.isDirectory()) {
        results.push(...scanDir(fullPath, base, agentId, agentName))
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!ALLOWED_EXTS.includes(ext)) continue
        if (EXCLUDED_FILES.has(entry.name)) continue

        try {
          const stat = fs.statSync(fullPath)
          results.push({
            name: entry.name,
            path: relPath.replace(/\\/g, '/'),
            agentId,
            agentName,
            ext,
            sizeKb: Math.round(stat.size / 1024),
            modifiedAt: stat.mtimeMs,
            source: 'local',
          })
        } catch { /* skip */ }
      }
    }
  } catch { /* dir not accessible */ }
  return results
}

// Nelson file server (runs on Nelson:3001) — serves workspace files over HTTP
const NELSON_FILE_SERVER = process.env.NELSON_FILE_SERVER_URL || 'http://192.168.7.6:3001'

async function fetchNelsonOutputs(agentFilter?: AgentName | null): Promise<OutputFile[]> {
  try {
    const params = new URLSearchParams()
    if (agentFilter) params.set('agent', agentFilter)

    const res = await fetch(`${NELSON_FILE_SERVER}/files?${params}`, {
      headers: {
        Authorization: `Bearer ${NELSON_TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return []
    const data = await res.json()

    return (data.files || []).map((f: {
      name: string; path: string; agentId: string; agentName: string;
      ext: string; sizeKb: number; modifiedAt: number
    }) => ({
      ...f,
      source: 'remote' as const,
    }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentFilter = searchParams.get('agent') as AgentName | null
  const extFilter = searchParams.get('ext')

  // Scan local workspaces
  const localFiles: OutputFile[] = []
  for (const ws of LOCAL_WORKSPACES) {
    if (agentFilter && ws.agentId !== agentFilter) continue
    localFiles.push(...scanDir(ws.dir, ws.dir, ws.agentId, ws.agentName))
  }

  // Fetch Nelson workspaces via file server
  const nelsonFiles = await fetchNelsonOutputs(agentFilter)
  const filteredNelson = nelsonFiles

  let allFiles = [...localFiles, ...filteredNelson]

  if (extFilter) {
    allFiles = allFiles.filter(f => f.ext === `.${extFilter}`)
  }

  // Sort by most recently modified
  allFiles.sort((a, b) => b.modifiedAt - a.modifiedAt)

  return NextResponse.json({
    files: allFiles,
    total: allFiles.length,
    timestamp: Date.now(),
  })
}
