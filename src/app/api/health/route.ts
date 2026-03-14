import { NextResponse } from 'next/server'
import { getAgentConfigs } from '@/config/agents'
import { OpenClawClient } from '@/lib/openclaw'

export async function GET() {
  const configs = getAgentConfigs()

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const client = new OpenClawClient(config)
      const online = await client.ping()
      return { id: config.id, name: config.displayName, online }
    })
  )

  const agents: Record<string, { online: boolean; name: string }> = {}
  results.forEach((result, i) => {
    const config = configs[i]
    if (result.status === 'fulfilled') {
      agents[config.id] = result.value
    } else {
      agents[config.id] = { online: false, name: config.displayName }
    }
  })

  const allOnline = Object.values(agents).every((a) => a.online)
  const anyOnline = Object.values(agents).some((a) => a.online)

  return NextResponse.json({
    status: allOnline ? 'healthy' : anyOnline ? 'degraded' : 'offline',
    agents,
    timestamp: Date.now(),
  })
}
