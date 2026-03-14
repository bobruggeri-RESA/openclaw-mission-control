import { AgentConfig, AgentName } from '@/lib/types'

export const AGENT_CONFIGS: Record<AgentName, Omit<AgentConfig, 'gatewayUrl' | 'token'>> = {
  nelson: {
    id: 'nelson',
    name: 'nelson',
    displayName: 'Nelson',
    color: '#60A5FA', // blue
  },
  kitt: {
    id: 'kitt',
    name: 'kitt',
    displayName: 'Kitt',
    color: '#34D399', // green
  },
  woodhouse: {
    id: 'woodhouse',
    name: 'woodhouse',
    displayName: 'Woodhouse',
    color: '#A78BFA', // purple
  },
}

export const AGENT_NAMES: AgentName[] = ['nelson', 'kitt', 'woodhouse']

export function getAgentConfigs(): AgentConfig[] {
  return AGENT_NAMES.map((id) => ({
    ...AGENT_CONFIGS[id],
    gatewayUrl: process.env[`${id.toUpperCase()}_GATEWAY_URL`] || '',
    token: process.env[`${id.toUpperCase()}_GATEWAY_TOKEN`] || '',
  }))
}

export function getAgentConfig(id: AgentName): AgentConfig {
  return {
    ...AGENT_CONFIGS[id],
    gatewayUrl: process.env[`${id.toUpperCase()}_GATEWAY_URL`] || '',
    token: process.env[`${id.toUpperCase()}_GATEWAY_TOKEN`] || '',
  }
}

// Model cost estimates (per 1M tokens)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-5-haiku': { input: 0.8, output: 4.0 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4-turbo': { input: 10.0, output: 30.0 },
  'google/gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'default': { input: 3.0, output: 15.0 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['default']
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}
