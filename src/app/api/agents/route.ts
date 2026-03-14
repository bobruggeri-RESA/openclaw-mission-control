import { NextRequest, NextResponse } from 'next/server'
import { AgentName, AgentStatus } from '@/lib/types'
import { AGENT_CONFIGS, AGENT_NAMES, getHostConfigs } from '@/config/agents'
import { cachedFetch } from '@/lib/cache'
import { OpenClawClient } from '@/lib/openclaw'

interface SessionStatusResult {
  model?: string
  uptime?: number
  channels?: string[]
  version?: string
  sessions?: Array<{ key: string; model?: string; tokens?: number }>
  token_usage?: number
}

async function fetchAgents() {
  const hostConfigs = getHostConfigs()
  const agents: AgentStatus[] = []

  // Query each host gateway once — it returns the primary (default) agent's status
  await Promise.allSettled(
    hostConfigs.map(async (host) => {
      if (!host.gatewayUrl) return

      const client = new OpenClawClient({
        id: host.id as AgentName,
        agentId: 'main',
        displayName: host.displayName,
        color: '#94A3B8',
        emoji: '🖥️',
        host: host.id,
        gatewayUrl: host.gatewayUrl,
        token: host.token,
      })

      // Get all agents that live on this host
      const hostAgents = AGENT_NAMES.filter(
        (id) => AGENT_CONFIGS[id].host === host.id
      )

      let online = false
      let statusData: SessionStatusResult | undefined

      try {
        statusData = await client.invoke<SessionStatusResult>('session_status', {})
        online = true
      } catch {
        // host unreachable
      }

      // Add an entry for each agent on this host
      for (const agentId of hostAgents) {
        const config = AGENT_CONFIGS[agentId]
        const isPrimary = config.agentId === 'main'

        agents.push({
          agentId,
          agentName: config.displayName,
          online,
          // Only the primary agent gets live status data from the gateway
          model: isPrimary && statusData ? statusData.model : undefined,
          sessionCount: isPrimary && statusData ? statusData.sessions?.length : undefined,
          tokenUsage: isPrimary && statusData ? statusData.token_usage : undefined,
          uptime: isPrimary && statusData ? statusData.uptime : undefined,
          channels: isPrimary && statusData ? statusData.channels : undefined,
          version: isPrimary && statusData ? statusData.version : undefined,
          lastSeen: online ? Date.now() : undefined,
          error: online ? undefined : `Host ${host.displayName} unreachable`,
        })
      }
    })
  )

  // Sort: online first, then by display name
  agents.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return a.agentName.localeCompare(b.agentName)
  })

  return { agents, timestamp: Date.now() }
}

export async function GET(request: NextRequest) {
  const live = request.nextUrl.searchParams.get('live') === 'true'
  const { data, fromCache, cachedAt } = await cachedFetch('agents', fetchAgents, { live })
  return NextResponse.json({ ...data, fromCache, cachedAt })
}
