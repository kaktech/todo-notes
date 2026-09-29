/**
 * useTasks: custom hook that manages all task state and API calls.
 * Handles fetching, creating, updating, deleting, and reordering tasks.
 */
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../shared/api'

// Generate a unique user ID stored in localStorage
function getUserId() {
  let id = localStorage.getItem('user_id')
  if (!id) {
    id = 'user-' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('user_id', id)
  }
  return id
}

const USER_ID = getUserId()

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch tasks from the API
  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ user_id: USER_ID, ...params })
      const res = await apiFetch(`/tasks?${query}`)
      if (!res.ok) throw new Error('Failed to load tasks')
      setTasks(await res.json())
    } catch {
      setError('Could not load tasks. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create a new task
  const createTask = async (taskData) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskData, user_id: USER_ID }),
    })
    if (!res.ok) throw new Error('Failed to create task')
    await fetchTasks()
  }

  // Update a task (title, completed, priority, etc.)
  const updateTask = async (id, updates) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update task')
    await fetchTasks()
  }

  // Delete a task
  const deleteTask = async (id) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete task')
    await fetchTasks()
  }

  // Reorder tasks (drag-and-drop)
  const reorderTasks = async (items) => {
    const res = await fetch('/api/tasks/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error('Failed to reorder tasks')
    await fetchTasks()
  }

  // Clear all completed tasks
  const clearCompleted = async () => {
    const res = await fetch(`/api/tasks/completed?user_id=${USER_ID}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to clear completed')
    await fetchTasks()
  }

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    clearCompleted,
  }
}
