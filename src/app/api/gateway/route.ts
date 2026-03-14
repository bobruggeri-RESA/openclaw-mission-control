import { NextRequest, NextResponse } from 'next/server'
import { safeInvoke } from '@/lib/openclaw'
import { AgentName } from '@/lib/types'

// Generic gateway proxy for any tool call
export async function POST(request: NextRequest) {
  const { agentId, tool, args } = await request.json()

  if (!agentId || !tool) {
    return NextResponse.json({ error: 'agentId and tool required' }, { status: 400 })
  }

  const { data, error } = await safeInvoke<unknown>(agentId as AgentName, tool, args || {})

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, data, timestamp: Date.now() })
}
