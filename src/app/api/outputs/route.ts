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

async function fetchNelsonOutputs(): Promise<OutputFile[]> {
  if (!NELSON_GATEWAY_URL) return []
  const results: OutputFile[] = []

  for (const ws of NELSON_WORKSPACES) {
    try {
      // Use exec via gateway to list files recursively
      const body = JSON.stringify({
        tool: 'exec',
        args: {
          command: `powershell -Command "Get-ChildItem '${ws.dir}' -Recurse -File | Where-Object { $_.Extension -in '.md','.txt','.json','.pdf','.docx','.csv' -and $_.Name -notin @('AGENTS.md','SOUL.md','USER.md','IDENTITY.md','HEARTBEAT.md','BOOTSTRAP.md','TOOLS.md') -and $_.FullName -notmatch 'node_modules|.git|.next|tmp' } | Select-Object Name, @{n='RelPath';e={$_.FullName.Replace('${ws.dir}\\','').Replace('\\','/')}}, Extension, @{n='SizeKb';e={[Math]::Round($_.Length/1024)}}, @{n='ModifiedAt';e={[DateTimeOffset]::new($_.LastWriteTime).ToUnixTimeMilliseconds()}} | ConvertTo-Json"`,
        },
        agentId: 'main',
      })

      const res = await fetch(`${NELSON_GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(NELSON_TOKEN ? { Authorization: `Bearer ${NELSON_TOKEN}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) continue
      const envelope = await res.json()
      if (!envelope.ok) continue

      const text = envelope.result?.content?.find((c: { type: string }) => c.type === 'text')?.text
      if (!text) continue

      // The exec tool wraps output — extract the actual stdout
      let jsonText = text
      // Try to find JSON array or object in the output
      const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/m)
      if (jsonMatch) jsonText = jsonMatch[1]

      const files = JSON.parse(jsonText)
      const fileArr = Array.isArray(files) ? files : [files]

      for (const f of fileArr) {
        if (!f?.Name || !f?.RelPath) continue
        results.push({
          name: f.Name,
          path: f.RelPath,
          agentId: ws.agentId,
          agentName: ws.agentName,
          ext: (f.Extension || '').toLowerCase(),
          sizeKb: f.SizeKb || 0,
          modifiedAt: f.ModifiedAt || 0,
          source: 'remote',
        })
      }
    } catch { /* skip this workspace */ }
  }

  return results
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

  // Fetch Nelson workspaces via gateway
  const nelsonFiles = await fetchNelsonOutputs()
  const filteredNelson = agentFilter
    ? nelsonFiles.filter(f => f.agentId === agentFilter)
    : nelsonFiles

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
