/**
 * Simple file-based cache for Mission Control.
 * Stores JSON data to disk with a TTL. Fast reads, background refreshes.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

const CACHE_DIR = process.env.CACHE_DIR || path.join(os.tmpdir(), 'mc-cache')
const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CacheEntry<T> {
  data: T
  cachedAt: number
  expiresAt: number
  key: string
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function cachePath(key: string): string {
  // Sanitize key for use as filename
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.json`)
}

export function cacheGet<T>(key: string): CacheEntry<T> | null {
  try {
    const file = cachePath(key)
    if (!fs.existsSync(file)) return null
    const raw = fs.readFileSync(file, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(raw)
    return entry
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): CacheEntry<T> {
  ensureCacheDir()
  const now = Date.now()
  const entry: CacheEntry<T> = {
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
    key,
  }
  fs.writeFileSync(cachePath(key), JSON.stringify(entry, null, 2), 'utf-8')
  return entry
}

export function cacheIsStale(entry: CacheEntry<unknown>): boolean {
  return Date.now() > entry.expiresAt
}

export function cacheDelete(key: string): void {
  try {
    const file = cachePath(key)
    if (fs.existsSync(file)) fs.unlinkSync(file)
  } catch { /* ignore */ }
}

export function cacheClear(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) return
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'))
    for (const f of files) fs.unlinkSync(path.join(CACHE_DIR, f))
  } catch { /* ignore */ }
}

export function cacheList(): Array<{ key: string; cachedAt: number; expiresAt: number; stale: boolean }> {
  try {
    ensureCacheDir()
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'))
    return files.map(f => {
      try {
        const entry: CacheEntry<unknown> = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8'))
        return {
          key: entry.key,
          cachedAt: entry.cachedAt,
          expiresAt: entry.expiresAt,
          stale: cacheIsStale(entry),
        }
      } catch {
        return { key: f, cachedAt: 0, expiresAt: 0, stale: true }
      }
    })
  } catch {
    return []
  }
}

/**
 * Get from cache or fetch fresh data.
 * If live=true, always fetches fresh and updates cache.
 * If stale, returns stale data but triggers background refresh (fire-and-forget).
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { live?: boolean; ttlMs?: number } = {}
): Promise<{ data: T; fromCache: boolean; cachedAt?: number }> {
  const { live = false, ttlMs = DEFAULT_TTL_MS } = options

  if (!live) {
    const entry = cacheGet<T>(key)
    if (entry && !cacheIsStale(entry)) {
      return { data: entry.data, fromCache: true, cachedAt: entry.cachedAt }
    }
  }

  // Fetch fresh
  const data = await fetcher()
  cacheSet(key, data, ttlMs)
  return { data, fromCache: false, cachedAt: Date.now() }
}
