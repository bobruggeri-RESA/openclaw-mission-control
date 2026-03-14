import { AgentConfig, AgentName, GatewayEnvelope } from './types'
import { getAgentConfig, getAgentConfigs } from '@/config/agents'

export class OpenClawClient {
  private config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  async invoke<T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
    const { gatewayUrl, token } = this.config

    if (!gatewayUrl) {
      throw new Error(`No gateway URL configured for agent ${this.config.displayName}`)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(`${gatewayUrl}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tool, args }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        throw new Error(`Gateway returned ${res.status}: ${res.statusText}`)
      }

      const envelope: GatewayEnvelope<T> = await res.json()
      return unwrapEnvelope<T>(envelope)
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Gateway timeout for agent ${this.config.displayName}`)
      }
      throw err
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.invoke('session_status', {})
      return true
    } catch {
      return false
    }
  }

  get agentId(): AgentName {
    return this.config.id
  }

  get agentName(): string {
    return this.config.displayName
  }
}

// Unwrap the gateway envelope to get the actual data
export function unwrapEnvelope<T = unknown>(envelope: GatewayEnvelope<T>): T {
  if (!envelope.ok) {
    throw new Error(envelope.error || 'Gateway returned ok=false')
  }

  if (!envelope.result) {
    throw new Error('Gateway returned no result')
  }

  // Try to parse text content as JSON first
  const textContent = envelope.result.content?.find((c) => c.type === 'text')
  if (textContent?.text) {
    try {
      return JSON.parse(textContent.text) as T
    } catch {
      // Return as-is if not JSON
      return textContent.text as unknown as T
    }
  }

  // Return details if available
  if (envelope.result.details !== undefined) {
    return envelope.result.details as T
  }

  return envelope.result as unknown as T
}

// Create a client for a specific agent
export function createClient(agentId: AgentName): OpenClawClient {
  const config = getAgentConfig(agentId)
  return new OpenClawClient(config)
}

// Create clients for all agents
export function createAllClients(): OpenClawClient[] {
  return getAgentConfigs().map((config) => new OpenClawClient(config))
}

// Run a tool call against all agents in parallel, collecting results
export async function invokeAll<T = unknown>(
  tool: string,
  args: Record<string, unknown> = {}
): Promise<Array<{ agentId: AgentName; agentName: string; data?: T; error?: string }>> {
  const clients = createAllClients()

  const results = await Promise.allSettled(
    clients.map((client) =>
      client.invoke<T>(tool, args).then((data) => ({
        agentId: client.agentId,
        agentName: client.agentName,
        data,
      }))
    )
  )

  return results.map((result, i) => {
    const client = clients[i]
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        agentId: client.agentId,
        agentName: client.agentName,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }
    }
  })
}

// Safely invoke a tool, returning null on error
export async function safeInvoke<T = unknown>(
  agentId: AgentName,
  tool: string,
  args: Record<string, unknown> = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const client = createClient(agentId)
    const data = await client.invoke<T>(tool, args)
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
