import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

function scanSkillsDir(dir: string): SkillInfo[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const skills: SkillInfo[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillDir = path.join(dir, entry.name)
      const skillMd = path.join(skillDir, 'SKILL.md')

      let description: string | undefined
      let version: string | undefined
      let author: string | undefined

      if (fs.existsSync(skillMd)) {
        try {
          const content = fs.readFileSync(skillMd, 'utf-8').slice(0, 500)
          const descMatch = content.match(/description:\s*(.+)/i)
          const verMatch = content.match(/version:\s*(.+)/i)
          const authMatch = content.match(/author:\s*(.+)/i)
          description = descMatch?.[1]?.trim().replace(/^["']|["']$/g, '').slice(0, 100)
          version = verMatch?.[1]?.trim()
          author = authMatch?.[1]?.trim()
        } catch { /* skip */ }
      }

      skills.push({ name: entry.name, description, version, author })
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

function scanKnowledgeDir(dir: string): KnowledgeInfo[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const articles: KnowledgeInfo[] = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!['.md', '.txt', '.docx', '.pdf', '.json'].includes(ext)) continue

      let sizeKb = 0
      try {
        const stat = fs.statSync(path.join(dir, entry.name))
        sizeKb = Math.round(stat.size / 1024)
      } catch { /* skip */ }

      articles.push({ name: entry.name, ext, sizeKb })
    }

    return articles.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

// Try multiple possible paths for the shared folders
// The dashboard may run on Kitt (no direct share access) or Nelson (direct access)
function findSharedSkillsDir(): string {
  const candidates = [
    '\\\\Nelson\\OpenClawSkills',
    '\\\\192.168.7.6\\OpenClawSkills',
    process.env.SHARED_SKILLS_DIR || '',
  ].filter(Boolean)

  for (const dir of candidates) {
    try {
      fs.readdirSync(dir)
      return dir
    } catch { /* try next */ }
  }
  return ''
}

function findSharedKnowledgeDir(): string {
  const candidates = [
    '\\\\Nelson\\OpenClawKnowledge',
    '\\\\192.168.7.6\\OpenClawKnowledge',
    process.env.SHARED_KNOWLEDGE_DIR || '',
  ].filter(Boolean)

  for (const dir of candidates) {
    try {
      fs.readdirSync(dir)
      return dir
    } catch { /* try next */ }
  }
  return ''
}

// Fetch shared skills from Nelson's gateway (used when running on Kitt)
async function fetchFromNelsonGateway<T>(tool: string, args: Record<string, unknown>): Promise<T | null> {
  const nelsonUrl = process.env.NELSON_GATEWAY_URL
  const nelsonToken = process.env.NELSON_GATEWAY_TOKEN
  if (!nelsonUrl) return null

  try {
    const res = await fetch(`${nelsonUrl}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(nelsonToken ? { Authorization: `Bearer ${nelsonToken}` } : {}),
      },
      body: JSON.stringify({ tool, args, agentId: 'main' }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const envelope = await res.json()
    if (!envelope.ok) return null
    const text = envelope.result?.content?.find((c: { type: string }) => c.type === 'text')?.text
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function GET() {
  const builtinSkillsDir = path.join(
    process.env.APPDATA || 'C:\\Users\\Bob\\AppData\\Roaming',
    'npm', 'node_modules', 'openclaw', 'skills'
  )

  // Try local filesystem first (works when running on Nelson)
  const sharedSkillsDir = findSharedSkillsDir()
  const sharedKnowledgeDir = findSharedKnowledgeDir()

  let sharedSkills: SkillInfo[] = sharedSkillsDir ? scanSkillsDir(sharedSkillsDir) : []
  let sharedKnowledge: KnowledgeInfo[] = sharedKnowledgeDir ? scanKnowledgeDir(sharedKnowledgeDir) : []

  // Fallback: ask Nelson's gateway to read the shares for us
  if (sharedSkills.length === 0) {
    const result = await fetchFromNelsonGateway<{ skills: SkillInfo[] }>('exec', {
      command: `powershell -Command "Get-ChildItem '\\\\Nelson\\OpenClawSkills' -Directory | Select-Object -ExpandProperty Name | ConvertTo-Json"`,
    })
    if (result) {
      // Parse the exec result — it returns names as JSON array
      try {
        const names: string[] = typeof result === 'object' && 'output' in result
          ? JSON.parse((result as { output: string }).output)
          : []
        sharedSkills = names.map((n) => ({ name: n }))
      } catch { /* skip */ }
    }
  }

  if (sharedKnowledge.length === 0) {
    const result = await fetchFromNelsonGateway<{ output: string }>('exec', {
      command: `powershell -Command "Get-ChildItem '\\\\Nelson\\OpenClawKnowledge' -File | Where-Object { $_.Extension -in '.md','.txt','.docx','.pdf','.json' } | ForEach-Object { [PSCustomObject]@{ name=$_.Name; ext=$_.Extension; sizeKb=[Math]::Round($_.Length/1024) } } | ConvertTo-Json"`,
    })
    if (result && 'output' in result) {
      try {
        const parsed = JSON.parse((result as { output: string }).output)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        sharedKnowledge = items.map((i: { name: string; ext: string; sizeKb: number }) => ({
          name: i.name,
          ext: i.ext,
          sizeKb: i.sizeKb || 0,
        }))
      } catch { /* skip */ }
    }
  }

  const builtinSkills = scanSkillsDir(builtinSkillsDir)

  return NextResponse.json({
    shared: {
      skills: sharedSkills,
      knowledge: sharedKnowledge,
    },
    builtin: {
      skills: builtinSkills,
    },
    summary: {
      sharedSkillsCount: sharedSkills.length,
      sharedKnowledgeCount: sharedKnowledge.length,
      builtinSkillsCount: builtinSkills.length,
      totalSkillsCount: sharedSkills.length + builtinSkills.length,
    },
    source: sharedSkillsDir ? 'local' : 'gateway',
  })
}
