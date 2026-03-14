import { NextRequest, NextResponse } from 'next/server'
import { invokeAll, safeInvoke } from '@/lib/openclaw'
import { AgentName, Session } from '@/lib/types'

interface SessionListResult {
  sessions?: Array<{
    key: string
    model?: string
    token_count?: number
    message_count?: number
    last_activity?: number
    created_at?: number
    label?: string
    channel?: string
  }>
}

interface SessionMessagesResult {
  messages?: Array<{
    role: string
    content: string | Array<{ type: string; text?: string; name?: string; arguments?: unknown }>
    timestamp?: number
  }>
  session?: {
    key: string
    model?: string
    token_count?: number
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentFilter = searchParams.get('agent') as AgentName | null
  const sessionKey = searchParams.get('key')

  // If fetching a specific session's messages
  if (sessionKey && agentFilter) {
    const { data, error } = await safeInvoke<SessionMessagesResult>(
      agentFilter,
      'session_get',
      { key: sessionKey }
    )
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ session: data, agentId: agentFilter })
  }

  // List all sessions
  const allResults = await invokeAll<SessionListResult>('sessions_list', {})
  const sessions: Session[] = []

  for (const result of allResults) {
    if (result.error || !result.data) continue
    if (agentFilter && result.agentId !== agentFilter) continue

    const sessionList = result.data.sessions || (Array.isArray(result.data) ? result.data as unknown[] : [])

    for (const s of sessionList as Array<{
      key: string; model?: string; token_count?: number;
      message_count?: number; last_activity?: number; created_at?: number;
      label?: string; channel?: string
    }>) {
      sessions.push({
        key: s.key,
        agentId: result.agentId as AgentName,
        agentName: result.agentName,
        model: s.model,
        tokenCount: s.token_count,
        messageCount: s.message_count,
        lastActivity: s.last_activity,
        createdAt: s.created_at,
        label: s.label,
        channel: s.channel,
      })
    }
  }

  // Sort by last activity descending
  sessions.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))

  return NextResponse.json({ sessions, total: sessions.length, timestamp: Date.now() })
}
