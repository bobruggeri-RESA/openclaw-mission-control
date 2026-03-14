'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Activity, Clock, Brain,
  DollarSign, Search, Settings, ListTodo, Radio,
  LogOut, Zap, Globe, Wifi, WifiOff
} from 'lucide-react'
import { AgentName } from '@/lib/types'
import { useLiveMode } from '@/lib/liveMode'

interface AgentHealth {
  agentId: AgentName
  name: string
  online: boolean
  color: string
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Users },
  { href: '/sessions', label: 'Sessions', icon: Activity },
  { href: '/feed', label: 'Feed', icon: Radio },
  { href: '/cron', label: 'Cron', icon: Clock },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/costs', label: 'Costs', icon: DollarSign },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/skills', label: 'Skills', icon: Globe },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const AGENT_COLORS: Record<AgentName, string> = {
  nelson: '#60A5FA',
  kitt: '#34D399',
  paul: '#FBBF24',
  monty: '#F87171',
  archer: '#A78BFA',
  woodhouse: '#94A3B8',
  terry: '#FB923C',
}

const AGENTS: Array<{ id: AgentName; name: string }> = [
  { id: 'nelson', name: 'Nelson' },
  { id: 'kitt', name: 'Kitt' },
  { id: 'paul', name: 'Paul' },
  { id: 'monty', name: 'Monty' },
  { id: 'archer', name: 'Archer' },
  { id: 'woodhouse', name: 'Woodhouse' },
  { id: 'terry', name: 'Terry' },
]

export function TopBar() {
  const pathname = usePathname()
  const { live, toggle } = useLiveMode()
  const [agentHealth, setAgentHealth] = useState<AgentHealth[]>(
    AGENTS.map((a) => ({ agentId: a.id, name: a.name, online: false, color: AGENT_COLORS[a.id] }))
  )

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.agents) {
        setAgentHealth(
          AGENTS.map((a) => ({
            agentId: a.id,
            name: a.name,
            online: data.agents[a.id]?.online ?? false,
            color: AGENT_COLORS[a.id],
          }))
        )
      }
    } catch {
      // keep previous state
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-2 px-4 h-14 border-b"
      style={{
        background: 'rgba(10,10,15,0.95)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mr-4 font-bold text-base"
        style={{ color: 'var(--accent-blue)' }}
      >
        <Zap size={18} />
        <span className="hidden sm:block">Mission Control</span>
      </Link>

      {/* Nav items */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto hide-scrollbar">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={{
                color: isActive ? '#E2E8F0' : '#64748B',
                background: isActive ? 'rgba(96,165,250,0.1)' : 'transparent',
                borderBottom: isActive ? '1px solid rgba(96,165,250,0.5)' : '1px solid transparent',
              }}
            >
              <Icon size={14} />
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </div>

      {/* Agent health indicators */}
      <div className="flex items-center gap-2 ml-2">
        {agentHealth.map((agent) => (
          <div key={agent.agentId} className="flex items-center gap-1.5 text-xs" title={`${agent.name}: ${agent.online ? 'Online' : 'Offline'}`}>
            <div
              className="rounded-full transition-all"
              style={{
                width: '8px',
                height: '8px',
                background: agent.online ? agent.color : '#F87171',
                boxShadow: agent.online ? `0 0 6px ${agent.color}` : 'none',
              }}
            />
            <span className="hidden xl:block" style={{ color: agent.online ? agent.color : '#64748B' }}>
              {agent.name}
            </span>
          </div>
        ))}
      </div>

      {/* Live/Cached toggle */}
      <button
        onClick={toggle}
        className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
        style={{
          background: live ? 'rgba(52,211,153,0.15)' : 'rgba(100,116,139,0.15)',
          color: live ? '#34D399' : '#64748B',
          border: `1px solid ${live ? 'rgba(52,211,153,0.3)' : 'rgba(100,116,139,0.2)'}`,
        }}
        title={live ? 'Live mode — click for cached' : 'Cached mode — click for live'}
      >
        {live ? <Wifi size={13} /> : <WifiOff size={13} />}
        <span className="hidden sm:block">{live ? 'Live' : 'Cached'}</span>
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="ml-1 p-2 rounded-lg transition-colors"
        style={{ color: '#64748B' }}
        title="Logout"
      >
        <LogOut size={16} />
      </button>
    </nav>
  )
}
