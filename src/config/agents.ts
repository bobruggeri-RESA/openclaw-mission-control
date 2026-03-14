import { AgentConfig, AgentName, HostConfig, HostName } from '@/lib/types'

// Physical hosts — each has one gateway
export const HOST_CONFIGS: Record<HostName, Omit<HostConfig, 'gatewayUrl' | 'token'>> = {
  nelson: {
    id: 'nelson',
    displayName: 'Nelson',
    ip: '192.168.7.6',
  },
  kitt: {
    id: 'kitt',
    displayName: 'Kitt',
    ip: '192.168.7.9',
  },
  woodhouse: {
    id: 'woodhouse',
    displayName: 'Woodhouse',
    ip: '192.168.7.11',
  },
}

export function getHostConfigs(): HostConfig[] {
  return (Object.keys(HOST_CONFIGS) as HostName[]).map((id) => ({
    ...HOST_CONFIGS[id],
    gatewayUrl: process.env[`${id.toUpperCase()}_GATEWAY_URL`] || '',
    token: process.env[`${id.toUpperCase()}_GATEWAY_TOKEN`] || '',
  }))
}

// All agents — some share a host/gateway, but have distinct agent IDs on that gateway
export const AGENT_CONFIGS: Record<AgentName, Omit<AgentConfig, 'gatewayUrl' | 'token'>> = {
  nelson: {
    id: 'nelson',
    agentId: 'main',        // agent ID within its gateway
    displayName: 'Nelson',
    color: '#60A5FA',       // blue
    emoji: '🫡',
    host: 'nelson',
  },
  kitt: {
    id: 'kitt',
    agentId: 'main',
    displayName: 'Kitt',
    color: '#34D399',       // green
    emoji: '🚗',
    host: 'kitt',
  },
  paul: {
    id: 'paul',
    agentId: 'paul',
    displayName: 'Paul',
    color: '#FBBF24',       // yellow
    emoji: '🎸',
    host: 'kitt',
  },
  monty: {
    id: 'monty',
    agentId: 'monty',
    displayName: 'Monty',
    color: '#F87171',       // red
    emoji: '🏰',
    host: 'kitt',
  },
  archer: {
    id: 'archer',
    agentId: 'archer',
    displayName: 'Archer',
    color: '#A78BFA',       // purple
    emoji: '🎯',
    host: 'kitt',
  },
  woodhouse: {
    id: 'woodhouse',
    agentId: 'main',
    displayName: 'Woodhouse',
    color: '#94A3B8',       // slate
    emoji: '🧹',
    host: 'woodhouse',
  },
}

export const AGENT_NAMES: AgentName[] = ['nelson', 'kitt', 'paul', 'monty', 'archer', 'woodhouse']

export function getAgentConfigs(): AgentConfig[] {
  return AGENT_NAMES.map((id) => {
    const base = AGENT_CONFIGS[id]
    const hostEnvKey = base.host.toUpperCase()
    return {
      ...base,
      gatewayUrl: process.env[`${hostEnvKey}_GATEWAY_URL`] || '',
      token: process.env[`${hostEnvKey}_GATEWAY_TOKEN`] || '',
    }
  })
}

export function getAgentConfig(id: AgentName): AgentConfig {
  const base = AGENT_CONFIGS[id]
  const hostEnvKey = base.host.toUpperCase()
  return {
    ...base,
    gatewayUrl: process.env[`${hostEnvKey}_GATEWAY_URL`] || '',
    token: process.env[`${hostEnvKey}_GATEWAY_TOKEN`] || '',
  }
}

// Model cost estimates (per 1M tokens)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4-6': { input: 15.0, output: 75.0 },
  'anthropic/claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-5-haiku': { input: 0.8, output: 4.0 },
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'xai/grok-3': { input: 3.0, output: 15.0 },
  'xai/grok-3-mini': { input: 0.3, output: 0.5 },
  'default': { input: 3.0, output: 15.0 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['default']
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}
