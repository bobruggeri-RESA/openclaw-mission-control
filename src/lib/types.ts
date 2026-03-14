// Agent types
export type AgentName = 'nelson' | 'kitt' | 'woodhouse'

export interface AgentConfig {
  id: AgentName
  name: string
  displayName: string
  color: string
  gatewayUrl: string
  token: string
}

// Gateway response types
export interface GatewayEnvelope<T = unknown> {
  ok: boolean
  result?: {
    content: Array<{ type: string; text?: string }>
    details?: T
  }
  error?: string
}

// Session types
export interface SessionMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
  timestamp?: number
}

export interface MessagePart {
  type: 'text' | 'toolCall' | 'toolResult'
  text?: string
  name?: string
  arguments?: Record<string, unknown>
  result?: unknown
}

export interface Session {
  key: string
  agentId: AgentName
  agentName: string
  model?: string
  tokenCount?: number
  messageCount?: number
  lastActivity?: number
  createdAt?: number
  messages?: SessionMessage[]
  label?: string
  channel?: string
}

// Cron job types
export interface CronSchedule {
  kind: 'cron'
  expr: string
  tz?: string
}

export interface CronJob {
  id: string
  agentId: AgentName
  agentName: string
  name: string
  prompt: string
  schedule: CronSchedule
  model?: string
  enabled: boolean
  lastRun?: number
  nextRun?: number
  runCount?: number
  channel?: string
}

// Memory types
export interface MemoryFile {
  agentId: AgentName
  agentName: string
  path: string
  name: string
  content: string
  updatedAt?: number
}

// Agent status
export interface AgentStatus {
  agentId: AgentName
  agentName: string
  online: boolean
  model?: string
  sessionCount?: number
  tokenUsage?: number
  uptime?: number
  channels?: string[]
  version?: string
  lastSeen?: number
  error?: string
}

// Activity/feed types
export type ActivityType = 'tool' | 'assistant' | 'user' | 'system' | 'cron'

export interface ActivityItem {
  id: string
  agentId: AgentName
  agentName: string
  type: ActivityType
  content: string
  timestamp: number
  sessionKey?: string
  toolName?: string
  model?: string
}

// Task types
export type TaskStatus = 'backlog' | 'in-progress' | 'review' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  assignedTo?: AgentName
  createdAt: number
  updatedAt: number
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
}

// Cost types
export interface TokenUsage {
  agentId: AgentName
  agentName: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  date: string
}

export interface CostSummary {
  totalTokens: number
  totalCost: number
  byAgent: Record<AgentName, { tokens: number; cost: number }>
  byModel: Record<string, { tokens: number; cost: number }>
  byDay: Array<{ date: string; tokens: number; cost: number }>
}

// Search types
export interface SearchResult {
  id: string
  category: 'memory' | 'session' | 'cron' | 'file' | 'task'
  title: string
  snippet: string
  agentId?: AgentName
  agentName?: string
  url?: string
  score?: number
}

// Gateway stats
export interface GatewayStats {
  sessions_today: number
  total_tokens: number
  active_crons: number
  uptime_seconds: number
}
