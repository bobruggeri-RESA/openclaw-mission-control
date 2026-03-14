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

export async function GET() {
  const sharedSkillsDir = '\\\\Nelson\\OpenClawSkills'
  const sharedKnowledgeDir = '\\\\Nelson\\OpenClawKnowledge'
  const builtinSkillsDir = path.join(
    process.env.APPDATA || 'C:\\Users\\Bob\\AppData\\Roaming',
    'npm', 'node_modules', 'openclaw', 'skills'
  )

  const sharedSkills = scanSkillsDir(sharedSkillsDir)
  const sharedKnowledge = scanKnowledgeDir(sharedKnowledgeDir)
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
  })
}
