'use client'

import { useState, useEffect, useCallback } from 'react'
import { ListTodo, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { Task, TaskStatus, AgentName } from '@/lib/types'
import { AgentBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AGENT_NAMES } from '@/config/agents'

const COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'backlog', label: 'Backlog', color: '#64748B' },
  { id: 'in-progress', label: 'In Progress', color: '#60A5FA' },
  { id: 'review', label: 'Review', color: '#FBBF24' },
  { id: 'done', label: 'Done', color: '#34D399' },
]

const PRIORITY_COLORS = {
  low: '#64748B',
  medium: '#FBBF24',
  high: '#F87171',
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onMove: (id: string, status: TaskStatus) => void
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  return (
    <div
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
          {task.title}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded transition-colors"
            style={{ color: '#64748B' }}
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded transition-colors"
            style={{ color: '#64748B' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs mb-2 line-clamp-2" style={{ color: '#64748B' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {task.priority && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: `${PRIORITY_COLORS[task.priority]}15`,
                color: PRIORITY_COLORS[task.priority],
                fontSize: '0.65rem',
              }}
            >
              {task.priority}
            </span>
          )}
          {task.assignedTo && (
            <AgentBadge agentId={task.assignedTo} agentName={task.assignedTo} />
          )}
        </div>

        {/* Move to column */}
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{ color: '#64748B', background: 'rgba(42,42,62,0.5)' }}
          >
            Move
          </button>
          {showMoveMenu && (
            <div
              className="absolute right-0 top-6 z-10 rounded-lg py-1 min-w-max"
              style={{ background: '#1E1E35', border: '1px solid var(--border)' }}
            >
              {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    onMove(task.id, col.id)
                    setShowMoveMenu(false)
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                  style={{ color: col.color }}
                >
                  → {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskColumn({
  column,
  tasks,
  onEdit,
  onDelete,
  onMove,
  onDrop,
}: {
  column: (typeof COLUMNS)[0]
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onMove: (id: string, status: TaskStatus) => void
  onDrop: (taskId: string, status: TaskStatus) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: dragOver ? 'rgba(96,165,250,0.05)' : 'rgba(10,10,15,0.3)',
        border: `1px solid ${dragOver ? 'rgba(96,165,250,0.3)' : 'var(--border)'}`,
        minHeight: 400,
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const taskId = e.dataTransfer.getData('taskId')
        if (taskId) onDrop(taskId, column.id)
      }}
    >
      <div
        className="px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--border)', borderTop: `3px solid ${column.color}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: column.color }}>
            {column.label}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${column.color}15`, color: column.color }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center h-24 rounded-lg border-dashed border text-sm"
            style={{ borderColor: 'var(--border)', color: '#334155' }}
          >
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}

function TaskModal({
  task,
  onSave,
  onClose,
}: {
  task?: Task
  onSave: (data: Partial<Task>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'backlog' as TaskStatus,
    priority: task?.priority || 'medium' as 'low' | 'medium' | 'high',
    assignedTo: task?.assignedTo || '' as AgentName | '',
    tags: (task?.tags || []).join(', '),
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      assignedTo: form.assignedTo || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: '#E2E8F0' }}>
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <button onClick={onClose} style={{ color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task title"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0', fontSize: '0.875rem', resize: 'vertical' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0' }}
              >
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>Assign to Agent</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value as AgentName | '' })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: '#0A0A0F', border: '1px solid var(--border)', color: '#E2E8F0' }}
            >
              <option value="">Unassigned</option>
              {AGENT_NAMES.map((id) => (
                <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Check size={14} />} onClick={handleSave} loading={saving}>
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editTask, setEditTask] = useState<Task | undefined>(undefined)
  const [showCreate, setShowCreate] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreate = async (data: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', task: data }),
    })
    await fetchTasks()
  }

  const handleEdit = async (data: Partial<Task>) => {
    if (!editTask) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: editTask.id, task: data }),
    })
    await fetchTasks()
    setEditTask(undefined)
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    await fetchTasks()
  }

  const handleMove = async (id: string, status: TaskStatus) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', id, task: { status } }),
    })
    await fetchTasks()
  }

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status)

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListTodo size={24} style={{ color: '#60A5FA' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
              Tasks
            </h1>
            <Badge variant="blue">{tasks.length}</Badge>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => setShowCreate(true)}
          >
            New Task
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: 300 }}>
                <div className="h-2 w-full" style={{ background: col.color }} />
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 skeleton rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={getColumnTasks(column.id)}
                onEdit={setEditTask}
                onDelete={handleDelete}
                onMove={handleMove}
                onDrop={handleMove}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <TaskModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTask && (
        <TaskModal
          task={editTask}
          onSave={handleEdit}
          onClose={() => setEditTask(undefined)}
        />
      )}
    </ErrorBoundary>
  )
}
