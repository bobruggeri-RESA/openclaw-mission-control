'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LiveModeContextValue {
  live: boolean
  setLive: (v: boolean) => void
  toggle: () => void
}

const LiveModeContext = createContext<LiveModeContextValue>({
  live: false,
  setLive: () => {},
  toggle: () => {},
})

export function LiveModeProvider({ children }: { children: ReactNode }) {
  const [live, setLiveState] = useState(false)

  // Persist to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mc-live-mode')
    if (stored === 'true') setLiveState(true)
  }, [])

  const setLive = (v: boolean) => {
    setLiveState(v)
    localStorage.setItem('mc-live-mode', String(v))
  }

  const toggle = () => setLive(!live)

  return (
    <LiveModeContext.Provider value={{ live, setLive, toggle }}>
      {children}
    </LiveModeContext.Provider>
  )
}

export function useLiveMode() {
  return useContext(LiveModeContext)
}

/**
 * Append ?live=true to a URL when in live mode.
 */
export function liveUrl(url: string, live: boolean): string {
  if (!live) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}live=true`
}
