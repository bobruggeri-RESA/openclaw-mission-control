import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORKSPACE_ROOTS: Record<string, string> = {
  kitt: 'C:\\Users\\Bob\\.openclaw\\workspace',
  paul: 'C:\\Users\\Bob\\.openclaw\\workspace-paul',
  monty: 'C:\\Users\\Bob\\.openclaw\\workspace-monty',
  archer: 'C:\\Users\\Bob\\.openclaw\\workspace-archer',
}

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
