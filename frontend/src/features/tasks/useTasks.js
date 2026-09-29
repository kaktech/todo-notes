/**
 * useTasks: loads ALL of the user's tasks once; the Timeline filters them by day.
 * Every change refetches so the list always matches the server.
 */
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../shared/api'

export function useTasks(userId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch(`/tasks?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error('load failed')
      setTasks(await res.json())
      setError('')
    } catch {
      setError('Could not load tasks. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Returns the created task (its id is needed to attach tags and subtasks)
  async function createTask(data) {
    const res = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: userId }),
    })
    if (!res.ok) throw new Error('Failed to create task')
    const task = await res.json()
    await fetchTasks()
    return task
  }

  async function updateTask(id, updates) {
    const res = await apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    if (!res.ok) throw new Error('Failed to update task')
    await fetchTasks()
  }

  async function deleteTask(id) {
    const res = await apiFetch(`/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete task')
    await fetchTasks()
  }

  // items: [{ id, position }]
  async function reorderTasks(items) {
    const res = await apiFetch('/tasks/reorder', { method: 'PUT', body: JSON.stringify({ items }) })
    if (!res.ok) throw new Error('Failed to reorder tasks')
    await fetchTasks()
  }

  async function deleteAllTasks() {
    await Promise.all(tasks.map(t => apiFetch(`/tasks/${t.id}`, { method: 'DELETE' })))
    await fetchTasks()
  }

  return { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, deleteAllTasks }
}
