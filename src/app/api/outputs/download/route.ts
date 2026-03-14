import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORKSPACE_ROOTS: Record<string, string> = {
  kitt: 'C:\\Users\\Bob\\.openclaw\\workspace',
  paul: 'C:\\Users\\Bob\\.openclaw\\workspace-paul',
  monty: 'C:\\Users\\Bob\\.openclaw\\workspace-monty',
  archer: 'C:\\Users\\Bob\\.openclaw\\workspace-archer',
}

// Agents served by Nelson's file server
const NELSON_AGENTS = new Set(['nelson', 'terry', 'reacher', 'archer'])
const NELSON_FILE_SERVER = process.env.NELSON_FILE_SERVER_URL || 'http://192.168.7.6:3001'
const NELSON_TOKEN = process.env.NELSON_GATEWAY_TOKEN || ''

const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.csv': 'text/csv',
  '.html': 'text/html',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent')
  const filePath = searchParams.get('path')

  if (!agentId || !filePath) {
    return NextResponse.json({ error: 'Missing agent or path' }, { status: 400 })
  }

  // Remote agents — proxy through Nelson file server
  if (NELSON_AGENTS.has(agentId)) {
    try {
      const params = new URLSearchParams({ agent: agentId, path: filePath })
      const upstream = await fetch(`${NELSON_FILE_SERVER}/download?${params}`, {
        headers: { Authorization: `Bearer ${NELSON_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!upstream.ok) return NextResponse.json({ error: 'File not found on Nelson' }, { status: 404 })
      const content = await upstream.arrayBuffer()
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
      const fileName = path.basename(filePath)
      return new NextResponse(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Could not reach Nelson file server' }, { status: 503 })
    }
  }

  const root = WORKSPACE_ROOTS[agentId]
  if (!root) {
    return NextResponse.json({ error: 'Agent not available for download from this host' }, { status: 404 })
  }

  // Security: prevent path traversal
  const resolved = path.resolve(root, filePath.replace(/\//g, path.sep))
  if (!resolved.startsWith(root)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const ext = path.extname(resolved).toLowerCase()
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
  const fileName = path.basename(resolved)
  const content = fs.readFileSync(resolved)

  return new NextResponse(content, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': content.length.toString(),
    },
  })
}
