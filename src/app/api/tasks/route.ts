import { NextRequest, NextResponse } from 'next/server'
import { Task, TaskStatus } from '@/lib/types'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const TASKS_FILE = join(process.cwd(), 'data', 'tasks.json')

function loadTasks(): Task[] {
  try {
    if (existsSync(TASKS_FILE)) {
      return JSON.parse(readFileSync(TASKS_FILE, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return []
}

function saveTasks(tasks: Task[]) {
  try {
    const dir = join(process.cwd(), 'data')
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs')
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
  } catch (err) {
    console.error('Failed to save tasks:', err)
  }
}

export async function GET() {
  const tasks = loadTasks()
  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, task, id } = body

  let tasks = loadTasks()

  if (action === 'create') {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: task.title || 'Untitled Task',
      description: task.description,
      status: (task.status as TaskStatus) || 'backlog',
      assignedTo: task.assignedTo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority: task.priority || 'medium',
      tags: task.tags || [],
    }
    tasks.push(newTask)
    saveTasks(tasks)
    return NextResponse.json({ ok: true, task: newTask })
  }

  if (action === 'update' && id) {
    tasks = tasks.map((t) =>
      t.id === id ? { ...t, ...task, id, updatedAt: Date.now() } : t
    )
    saveTasks(tasks)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete' && id) {
    tasks = tasks.filter((t) => t.id !== id)
    saveTasks(tasks)
    return NextResponse.json({ ok: true })
  }

  if (action === 'move' && id) {
    tasks = tasks.map((t) =>
      t.id === id ? { ...t, status: task.status as TaskStatus, updatedAt: Date.now() } : t
    )
    saveTasks(tasks)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
