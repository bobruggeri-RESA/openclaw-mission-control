import { NextRequest, NextResponse } from 'next/server'
import { invokeAll, safeInvoke } from '@/lib/openclaw'
import { AgentName, CronJob, CronSchedule } from '@/lib/types'

interface CronListResult {
  jobs?: Array<{
    id: string
    name?: string
    prompt: string
    schedule: CronSchedule | string
    model?: string
    enabled?: boolean
    last_run?: number
    next_run?: number
    run_count?: number
    channel?: string
  }>
}

function normalizeSchedule(schedule: CronSchedule | string | unknown): CronSchedule {
  if (typeof schedule === 'string') {
    return { kind: 'cron', expr: schedule }
  }
  if (schedule && typeof schedule === 'object') {
    const s = schedule as Record<string, unknown>
    return {
      kind: 'cron',
      expr: (s.expr as string) || (s.expression as string) || '* * * * *',
      tz: s.tz as string | undefined,
    }
  }
  return { kind: 'cron', expr: '* * * * *' }
}

export async function GET() {
  const results = await invokeAll<CronListResult>('cron_list', {})
  const jobs: CronJob[] = []

  for (const result of results) {
    if (result.error || !result.data) continue

    const jobList = result.data.jobs || (Array.isArray(result.data) ? result.data as unknown[] : [])
    for (const j of jobList as Array<{
      id: string; name?: string; prompt: string;
      schedule: CronSchedule | string; model?: string; enabled?: boolean;
      last_run?: number; next_run?: number; run_count?: number; channel?: string
    }>) {
      jobs.push({
        id: j.id,
        agentId: result.agentId as AgentName,
        agentName: result.agentName,
        name: j.name || j.id,
        prompt: j.prompt,
        schedule: normalizeSchedule(j.schedule),
        model: j.model,
        enabled: j.enabled !== false,
        lastRun: j.last_run,
        nextRun: j.next_run,
        runCount: j.run_count,
        channel: j.channel,
      })
    }
  }

  return NextResponse.json({ jobs, total: jobs.length, timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { agentId, action, jobId, ...jobData } = body

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  let tool = 'cron_create'
  let args: Record<string, unknown> = jobData

  if (action === 'delete' && jobId) {
    tool = 'cron_delete'
    args = { id: jobId }
  } else if (action === 'trigger' && jobId) {
    tool = 'cron_trigger'
    args = { id: jobId }
  } else if (action === 'toggle' && jobId) {
    tool = 'cron_update'
    args = { id: jobId, enabled: jobData.enabled }
  } else if (action === 'update' && jobId) {
    tool = 'cron_update'
    args = { id: jobId, ...jobData }
  }

  const { data, error } = await safeInvoke(agentId as AgentName, tool, args)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
