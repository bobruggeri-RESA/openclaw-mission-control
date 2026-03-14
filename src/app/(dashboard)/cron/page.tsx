'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, Play, Pause, Trash2, Edit2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { CronJob, AgentName } from '@/lib/types'
import { Badge, AgentBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { AGENT_NAMES } from '@/config/agents'

function parseCronExpr(expr: string): string {
  try {
    // Simple human-readable descriptions for common expressions
    const common: Record<string, string> = {
      '* * * * *': 'Every minute',
      '0 * * * *': 'Every hour',
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9 AM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on the 1st',
      '*/5 * * * *': 'Every 5 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 */2 * * *': 'Every 2 hours',
      '0 8-18 * * 1-5': 'Weekdays 8 AM – 6 PM',
    }

    if (common[expr]) return common[expr]

    const parts = expr.split(' ')
    if (parts.length !== 5) return expr

    const [min, hour, dom, month, dow] = parts

    if (dom === '*' && month === '*' && dow === '*') {
      if (min === '0' && hour !== '*') {
        return `Daily at ${hour.padStart(2, '0')}:00`
      }
      if (min !== '*' && hour !== '*') {
        return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
      }
    }

    return expr
  } catch {
    return expr
  }
}

function CronJobRow({
  job,
  onAction,
}: {
  job: CronJob
  onAction: (action: string, jobId: string, agentId: AgentName, data?: unknown) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: string, data?: unknown) => {
    setLoading(true)
    await onAction(action, job.id, job.agentId, data)
    setLoading(false)
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: job.enabled ? '#34D399' : '#64748B',
            }}
          />
          <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
            {job.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <AgentBadge agentId={job.agentId} agentName={job.agentName} />
      </td>
      <td className="px-4 py-3">
        <div>
          <span className="font-mono text-xs" style={{ color: '#60A5FA' }}>
            {job.schedule.expr}
          </span>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            {parseCronExpr(job.schedule.expr)}
            {job.schedule.tz && ` (${job.schedule.tz})`}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs truncate max-w-xs" style={{ color: '#64748B' }}>
          {job.prompt?.slice(0, 80)}{job.prompt?.length > 80 ? '...' : ''}
        </p>
      </td>
      <td className="px-4 py-3">
        {job.model && (
          <span className="text-xs font-mono" style={{ color: '#64748B' }}>
            {job.model.split('/').pop()}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs" style={{ color: '#64748B' }}>
          {job.runCount || 0}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            icon={<Play size={12} />}
            onClick={() => handleAction('trigger')}
            disabled={loading}
            title="Trigger now"
          >
          </Button>
          <Button
            size="sm"
            variant={job.enabled ? 'ghost' : 'success'}
            icon={job.enabled ? <Pause size={12} /> : <Play size={12} />}
            onClick={() => handleAction('toggle', { enabled: !job.enabled })}
            disabled={loading}
            title={job.enabled ? 'Pause' : 'Enable'}
          >
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={12} />}
            onClick={() => handleAction('delete')}
            disabled={loading}
            title="Delete"
          >
          </Button>
        </div>
      </td>
    </tr>
  )
}

function WeeklyCalendar({ jobs }: { jobs: CronJob[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const today = new Date()

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Simple: determine which days each job runs based on cron expr
  function jobRunsOnDay(job: CronJob, day: Date): boolean {
    const expr = job.schedule.expr
    if (!expr) return false
    const parts = expr.split(' ')
    if (parts.length !== 5) return false
    const [, , , , dow] = parts
    if (dow === '*') return true
    const dayOfWeek = day.getDay() // 0=Sunday
    if (dow.includes(',')) {
      return dow.split(',').map(Number).includes(dayOfWeek)
    }
    return parseInt(dow) === dayOfWeek
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: '#60A5FA' }} />
          <h2 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>
            Weekly Schedule
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#64748B', background: 'rgba(42,42,62,0.5)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm" style={{ color: '#94A3B8' }}>
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#64748B', background: 'rgba(42,42,62,0.5)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayJobs = jobs.filter((j) => j.enabled && jobRunsOnDay(j, day))

          return (
            <div
              key={i}
              className="rounded-lg p-2"
              style={{
                background: isToday ? 'rgba(96,165,250,0.1)' : 'rgba(10,10,15,0.3)',
                border: `1px solid ${isToday ? 'rgba(96,165,250,0.3)' : 'var(--border)'}`,
                minHeight: 80,
              }}
            >
              <p
                className="text-xs font-semibold mb-1.5"
                style={{ color: isToday ? '#60A5FA' : '#64748B' }}
              >
                {format(day, 'EEE')}
                <br />
                <span style={{ fontSize: '0.85rem', color: isToday ? '#60A5FA' : '#94A3B8' }}>
                  {format(day, 'd')}
                </span>
              </p>
              <div className="space-y-1">
                {dayJobs.slice(0, 3).map((job) => {
                  const color = job.agentId === 'nelson' ? '#60A5FA' : job.agentId === 'kitt' ? '#34D399' : '#A78BFA'
                  return (
                    <div
                      key={job.id}
                      className="text-xs px-1 py-0.5 rounded truncate"
                      style={{ background: `${color}1A`, color, fontSize: '0.65rem' }}
                      title={job.name}
                    >
                      {job.name}
                    </div>
                  )
                })}
                {dayJobs.length > 3 && (
                  <p className="text-xs" style={{ color: '#475569', fontSize: '0.65rem' }}>
                    +{dayJobs.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreateJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    agentId: 'nelson' as AgentName,
    name: '',
    prompt: '',
    expr: '0 9 * * *',
    tz: 'America/Phoenix',
    model: '',
    channel: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.prompt || !form.expr) {
      setError('Name, prompt, and schedule are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          agentId: form.agentId,
          name: form.name,
          prompt: form.prompt,
          schedule: { kind: 'cron', expr: form.expr, tz: form.tz || undefined },
          model: form.model || undefined,
          channel: form.channel || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create job')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: '#E2E8F0' }}>Create Cron Job</h2>

        <div className="space-y-3">
          <FormField label="Agent">
            <select
              value={form.agentId}
              onChange={(e) => setForm({ ...form, agentId: e.target.value as AgentName })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0' }}
            >
              {AGENT_NAMES.map((id) => (
                <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Daily standup summary"
              className="input-field"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem' }}
            />
          </FormField>
          <FormField label="Schedule (cron)">
            <input
              value={form.expr}
              onChange={(e) => setForm({ ...form, expr: e.target.value })}
              placeholder="0 9 * * *"
              className="font-mono"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#60A5FA', fontSize: '0.875rem' }}
            />
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{parseCronExpr(form.expr)}</p>
          </FormField>
          <FormField label="Timezone">
            <input
              value={form.tz}
              onChange={(e) => setForm({ ...form, tz: e.target.value })}
              placeholder="America/Phoenix"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem' }}
            />
          </FormField>
          <FormField label="Prompt">
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="What should the agent do when this job runs?"
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem', resize: 'vertical' }}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Model (optional)">
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="anthropic/claude-3-5-haiku"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem' }}
              />
            </FormField>
            <FormField label="Channel (optional)">
              <input
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                placeholder="slack"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem' }}
              />
            </FormField>
          </div>
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Create Job
          </Button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>{label}</label>
      {children}
    </div>
  )
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cron')
      const data = await res.json()
      setJobs(data.jobs || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleAction = async (action: string, jobId: string, agentId: AgentName, data?: unknown) => {
    try {
      await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, agentId, ...(data as object || {}) }),
      })
      await fetchJobs()
    } catch (err) {
      console.error('Cron action failed:', err)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={24} style={{ color: '#FBBF24' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
              Cron Manager
            </h1>
            <Badge variant="yellow">{jobs.length} jobs</Badge>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => setShowCreate(true)}
          >
            New Job
          </Button>
        </div>

        <WeeklyCalendar jobs={jobs} />

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#94A3B8' }}>
              All Cron Jobs
            </h2>
          </div>

          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Agent', 'Schedule', 'Prompt', 'Model', 'Runs', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${h === 'Runs' ? 'text-right' : h === 'Actions' ? 'text-right' : 'text-left'}`}
                        style={{ color: '#64748B' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <CronJobRow
                      key={`${job.agentId}-${job.id}`}
                      job={job}
                      onAction={handleAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center" style={{ color: '#475569' }}>
              <Clock size={32} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
              <p>No cron jobs configured</p>
              <Button
                variant="secondary"
                icon={<Plus size={14} />}
                className="mt-3 mx-auto"
                onClick={() => setShowCreate(true)}
              >
                Create your first job
              </Button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchJobs}
        />
      )}
    </ErrorBoundary>
  )
}
