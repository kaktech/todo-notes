/*
 * TasksPage: the main todo list page.
 * Features: add, complete, edit, delete, reorder, filter, search,
 * bulk add, due dates, progress bar, clear completed.
 */
import { useState, useEffect, useCallback } from 'react'

// Helper: format a date string as "YYYY-MM-DD" for comparison
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Helper: get a human-friendly badge label for a due date
function getDueBadge(dueDate) {
  if (!dueDate) return null
  const today = todayStr()
  if (dueDate < today) return { label: 'Overdue', className: 'badge overdue' }
  if (dueDate === today) return { label: 'Due today', className: 'badge today' }
  // Calculate days difference
  const diff = Math.ceil((new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24))
  return { label: `Due in ${diff} day${diff === 1 ? '' : 's'}`, className: 'badge upcoming' }
}

export default function TasksPage() {
  // --- State ---
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [filter, setFilter] = useState('all') // all, active, completed, overdue
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null) // which task is being edited
  const [editText, setEditText] = useState('')
  const [showBulk, setShowBulk] = useState(false) // show bulk add textarea
  const [bulkText, setBulkText] = useState('')
  const [sortByDue, setSortByDue] = useState(false) // toggle sort by due date

  // --- Fetch tasks from the API ---
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let url = '/api/tasks'
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('filter', filter)
      if (search) params.set('search', search)
      if (params.toString()) url += '?' + params.toString()

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load tasks')
      let data = await res.json()

      // Optional: sort by due date (tasks without due date go last)
      if (sortByDue) {
        data = [...data].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date.localeCompare(b.due_date)
        })
      }

      setTasks(data)
    } catch {
      setError('Could not load tasks. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [filter, search, sortByDue])

  // Re-fetch whenever filter, search, or sort changes
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // --- Add a single task ---
  async function addTask() {
    const title = newTask.trim()
    if (!title) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date: newDueDate || null }),
      })
      if (!res.ok) throw new Error('Failed to add task')
      setNewTask('')
      setNewDueDate('')
      fetchTasks()
    } catch {
      setError('Failed to add task')
    }
  }

  // --- Bulk add: each line becomes a task ---
  async function addBulk() {
    const titles = bulkText.split('\n')
    if (titles.every(t => !t.trim())) return
    try {
      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles }),
      })
      if (!res.ok) throw new Error('Failed to bulk add')
      setBulkText('')
      setShowBulk(false)
      fetchTasks()
    } catch {
      setError('Failed to bulk add tasks')
    }
  }

  // --- Toggle complete/incomplete ---
  async function toggleTask(task) {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      fetchTasks()
    } catch {
      setError('Failed to update task')
    }
  }

  // --- Start editing a task ---
  function startEdit(task) {
    setEditingId(task.id)
    setEditText(task.title)
  }

  // --- Save edited task text ---
  async function saveEdit(id) {
    const title = editText.trim()
    if (!title) return
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      setEditingId(null)
      fetchTasks()
    } catch {
      setError('Failed to save task')
    }
  }

  // --- Delete a task ---
  async function deleteTask(id) {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      fetchTasks()
    } catch {
      setError('Failed to delete task')
    }
  }

  // --- Move task up or down ---
  async function moveTask(id, direction) {
    try {
      await fetch(`/api/tasks/${id}/move?direction=${direction}`, { method: 'POST' })
      fetchTasks()
    } catch {
      setError('Failed to move task')
    }
  }

  // --- Clear all completed tasks ---
  async function clearCompleted() {
    try {
      await fetch('/api/tasks/completed', { method: 'DELETE' })
      fetchTasks()
    } catch {
      setError('Failed to clear completed')
    }
  }

  // --- Compute progress stats ---
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // --- Render ---
  return (
    <div className="tasks-page">
      <h1>Tasks</h1>

      {/* Error message */}
      {error && <div className="error-banner">{error}</div>}

      {/* Add task form */}
      <div className="add-task-form">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          className="text-input"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={e => setNewDueDate(e.target.value)}
          className="date-input"
          title="Due date (optional)"
        />
        <button onClick={addTask} className="btn btn-primary">Add</button>
        <button onClick={() => setShowBulk(!showBulk)} className="btn btn-secondary">
          {showBulk ? 'Hide Bulk' : 'Bulk Add'}
        </button>
      </div>

      {/* Bulk add textarea */}
      {showBulk && (
        <div className="bulk-add">
          <textarea
            placeholder="Paste multiple lines — each line becomes a task..."
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={5}
            className="textarea-input"
          />
          <button onClick={addBulk} className="btn btn-primary">Add All Tasks</button>
        </div>
      )}

      {/* Search and filter controls */}
      <div className="controls-row">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-input search-input"
        />
        <label className="sort-toggle">
          <input
            type="checkbox"
            checked={sortByDue}
            onChange={e => setSortByDue(e.target.checked)}
          />
          Sort by due date
        </label>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {['all', 'active', 'completed', 'overdue'].map(f => (
          <button
            key={f}
            className={filter === f ? 'tab active' : 'tab'}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Progress bar and counter */}
      <div className="progress-section">
        <span className="progress-text">
          {completedTasks} of {totalTasks} tasks completed
        </span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Clear completed button */}
      {completedTasks > 0 && (
        <button onClick={clearCompleted} className="btn btn-danger btn-small">
          Clear completed
        </button>
      )}

      {/* Loading state */}
      {loading && <div className="loading">Loading tasks...</div>}

      {/* Task list */}
      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          {search ? 'No tasks match your search.' : 'No tasks yet, add your first one!'}
        </div>
      )}

      <ul className="task-list">
        {tasks.map(task => {
          const badge = getDueBadge(task.due_date)
          return (
            <li key={task.id} className={task.completed ? 'task-item completed' : 'task-item'}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task)}
                className="checkbox"
                aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
              />

              {/* Task text (or edit input) */}
              <div className="task-content">
                {editingId === task.id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(task.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => saveEdit(task.id)}
                    className="text-input edit-input"
                    autoFocus
                  />
                ) : (
                  <span
                    className="task-title"
                    onDoubleClick={() => startEdit(task)}
                    title="Double-click to edit"
                  >
                    {task.title}
                  </span>
                )}
                {badge && <span className={badge.className}>{badge.label}</span>}
              </div>

              {/* Action buttons */}
              <div className="task-actions">
                <button onClick={() => moveTask(task.id, 'up')} className="btn-icon" title="Move up" aria-label="Move up">&#9650;</button>
                <button onClick={() => moveTask(task.id, 'down')} className="btn-icon" title="Move down" aria-label="Move down">&#9660;</button>
                <button onClick={() => startEdit(task)} className="btn-icon" title="Edit" aria-label="Edit">&#9998;</button>
                <button onClick={() => deleteTask(task.id)} className="btn-icon btn-delete" title="Delete" aria-label="Delete">&#10005;</button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
