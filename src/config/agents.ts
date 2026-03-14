import { AgentConfig, AgentName, HostConfig, HostName } from '@/lib/types'

// Physical hosts — each has one gateway
export const HOST_CONFIGS: Record<HostName, Omit<HostConfig, 'gatewayUrl' | 'token'> & { agents: AgentName[]; sharedFolders?: string[] }> = {
  nelson: {
    id: 'nelson',
    displayName: 'Nelson',
    ip: '192.168.7.6',
    agents: ['nelson', 'kitt', 'paul', 'terry', 'reacher'],
    sharedFolders: ['\\\\Nelson\\OpenClawSkills', '\\\\Nelson\\OpenClawKnowledge'],
  },
  kitt: {
    id: 'kitt',
    displayName: 'Kitt',
    ip: '192.168.7.9',
    agents: ['kitt', 'archer', 'monty', 'paul'],
  },
  woodhouse: {
    id: 'woodhouse',
    displayName: 'Woodhouse',
    ip: '192.168.7.11',
    agents: ['woodhouse'],
  },
}

export function getHostConfigs(): (HostConfig & { agents: AgentName[] })[] {
  return (Object.keys(HOST_CONFIGS) as HostName[]).map((id) => ({
    ...HOST_CONFIGS[id],
    gatewayUrl: process.env[`${id.toUpperCase()}_GATEWAY_URL`] || '',
    token: process.env[`${id.toUpperCase()}_GATEWAY_TOKEN`] || '',
  }))
}

/**
 * Agent definitions.
 * Some agents (Kitt, Paul) exist on multiple hosts/gateways.
 * `instances` maps each host they live on to the agentId within that gateway.
 * `primaryHost` is the one we query by default.
 */
export const AGENT_CONFIGS: Record<AgentName, Omit<AgentConfig, 'gatewayUrl' | 'token'> & {
  instances: Partial<Record<HostName, string>>
}> = {
  nelson: {
    id: 'nelson',
    agentId: 'main',
    displayName: 'Nelson',
    color: '#60A5FA',  // blue
    emoji: '🫡',
    host: 'nelson',
    instances: { nelson: 'main' },
  },
  kitt: {
    id: 'kitt',
    agentId: 'main',
    displayName: 'Kitt',
    color: '#34D399',  // green
    emoji: '🚗',
    host: 'kitt',      // primary host
    instances: {
      nelson: 'kitt',  // also accessible via Nelson gateway
      kitt: 'main',    // main agent on Kitt gateway
    },
  },
  paul: {
    id: 'paul',
    agentId: 'paul',
    displayName: 'Paul',
    color: '#FBBF24',  // yellow
    emoji: '🎸',
    host: 'kitt',      // primary host
    instances: {
      nelson: 'paul',  // also on Nelson gateway
      kitt: 'paul',    // also on Kitt gateway
    },
  },
  monty: {
    id: 'monty',
    agentId: 'monty',
    displayName: 'Monty',
    color: '#F87171',  // red
    emoji: '🏰',
    host: 'kitt',
    instances: { kitt: 'monty' },
  },
  archer: {
    id: 'archer',
    agentId: 'archer',
    displayName: 'Archer',
    color: '#A78BFA',  // purple
    emoji: '🎯',
    host: 'kitt',
    instances: { kitt: 'archer' },
  },
  woodhouse: {
    id: 'woodhouse',
    agentId: 'main',
    displayName: 'Woodhouse',
    color: '#94A3B8',  // slate
    emoji: '🧹',
    host: 'woodhouse',
    instances: { woodhouse: 'main' },
  },
  terry: {
    id: 'terry',
    agentId: 'terry',
    displayName: 'Terry',
    color: '#FB923C',  // orange
    emoji: '🧪',
    host: 'nelson',
    instances: { nelson: 'terry' },
  },
  reacher: {
    id: 'reacher',
    agentId: 'reacher',
    displayName: 'Reacher',
    color: '#10B981',  // emerald
    emoji: '🎯',
    host: 'nelson',
    instances: { nelson: 'reacher' },
  },
}

export const AGENT_NAMES: AgentName[] = ['nelson', 'kitt', 'paul', 'monty', 'archer', 'woodhouse', 'terry', 'reacher']

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
