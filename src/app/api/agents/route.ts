import { NextRequest, NextResponse } from 'next/server'
import { invokeAll } from '@/lib/openclaw'
import { AgentName, AgentStatus } from '@/lib/types'
import { AGENT_CONFIGS } from '@/config/agents'
import { cachedFetch } from '@/lib/cache'

interface SessionStatusResult {
  session?: string
  model?: string
  uptime?: number
  channels?: string[]
  version?: string
  sessions?: Array<{ key: string; model?: string; tokens?: number }>
  token_usage?: number
}

async function fetchAgents() {
  const results = await invokeAll<SessionStatusResult>('session_status', {})
  const agents: AgentStatus[] = results.map((result) => {
    const config = AGENT_CONFIGS[result.agentId as AgentName]
    if (result.error || !result.data) {
      return {
        agentId: result.agentId as AgentName,
        agentName: result.agentName,
        online: false,
        error: result.error,
        lastSeen: undefined,
      }
    }
    const data = result.data
    return {
      agentId: result.agentId as AgentName,
      agentName: result.agentName,
      online: true,
      model: data.model,
      sessionCount: data.sessions?.length,
      tokenUsage: data.token_usage,
      uptime: data.uptime,
      channels: data.channels,
      version: data.version,
      lastSeen: Date.now(),
      color: config?.color,
    }
  })
  return { agents, timestamp: Date.now() }
}

export async function GET(request: NextRequest) {
  const live = request.nextUrl.searchParams.get('live') === 'true'
  const { data, fromCache, cachedAt } = await cachedFetch('agents', fetchAgents, { live })
  return NextResponse.json({ ...data, fromCache, cachedAt })
}
