'use client'

import { AgentName } from '@/lib/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray' | 'orange' | 'agent'
  agentId?: AgentName
  size?: 'sm' | 'md'
  style?: React.CSSProperties
}

const VARIANT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'rgba(96,165,250,0.15)', text: '#60A5FA', border: 'rgba(96,165,250,0.3)' },
  green: { bg: 'rgba(52,211,153,0.15)', text: '#34D399', border: 'rgba(52,211,153,0.3)' },
  purple: { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  red: { bg: 'rgba(248,113,113,0.15)', text: '#F87171', border: 'rgba(248,113,113,0.3)' },
  yellow: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
  gray: { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', border: 'rgba(100,116,139,0.3)' },
  orange: { bg: 'rgba(251,146,60,0.15)', text: '#FB923C', border: 'rgba(251,146,60,0.3)' },
}

const AGENT_COLORS: Record<AgentName, string> = {
  nelson: 'blue',
  kitt: 'green',
  paul: 'yellow',
  monty: 'red',
  archer: 'purple',
  woodhouse: 'gray',
  terry: 'orange',
  reacher: 'green',
}

export function Badge({ children, variant = 'gray', agentId, size = 'md', style: styleProp }: BadgeProps) {
  const effectiveVariant = agentId ? AGENT_COLORS[agentId] : variant
  const styles = VARIANT_STYLES[effectiveVariant] || VARIANT_STYLES.gray

  return (
    <span
      className="badge"
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
        ...styleProp,
      }}
    >
      {children}
    </span>
  )
}

export function AgentBadge({ agentId, agentName }: { agentId: AgentName; agentName: string }) {
  return (
    <Badge agentId={agentId}>
      {agentName}
    </Badge>
  )
}

export function StatusBadge({ online }: { online: boolean }) {
  return (
    <Badge variant={online ? 'green' : 'red'}>
      <span
        className="status-dot"
        style={{
          background: online ? '#34D399' : '#F87171',
          width: '6px',
          height: '6px',
        }}
      />
      {online ? 'Online' : 'Offline'}
    </Badge>
  )
}
