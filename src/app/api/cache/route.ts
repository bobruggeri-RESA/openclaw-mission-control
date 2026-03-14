import { NextRequest, NextResponse } from 'next/server'
import { cacheList, cacheClear, cacheDelete } from '@/lib/cache'

// GET /api/cache — list all cache entries and their status
export async function GET() {
  const entries = cacheList()
  return NextResponse.json({
    entries,
    count: entries.length,
    staleCount: entries.filter(e => e.stale).length,
  })
}

// DELETE /api/cache — clear all or a specific key
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key) {
    cacheDelete(key)
    return NextResponse.json({ ok: true, message: `Cleared cache for: ${key}` })
  }

  cacheClear()
  return NextResponse.json({ ok: true, message: 'All cache cleared' })
}
