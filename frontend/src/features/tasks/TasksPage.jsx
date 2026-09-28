/**
 * TasksPage: the main tasks screen.
 * Shows greeting, progress bar, search, filter tabs, grouped tasks,
 * and a FAB to add new tasks.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTasks } from './useTasks'
import TaskList from './TaskList'
import TaskForm from './TaskForm'
import ProgressBar from './ProgressBar'
import SearchBar from '../../shared/SearchBar'
import FAB from '../../shared/FAB'

export default function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, clearCompleted } = useTasks()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [categories, setCategories] = useState([])

  // Fetch categories once on mount
  useEffect(() => {
    fetch('/api/categories?user_id=' + localStorage.getItem('user_id'))
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Fetch tasks when filter or search changes
  const loadTasks = useCallback(() => {
    const params = {}
    if (filter !== 'all') params.filter = filter
    if (search) params.search = search
    fetchTasks(params)
  }, [filter, search, fetchTasks])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Count today's tasks for greeting
  const today = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter(t => t.due_date === today)
  const completedToday = todayTasks.filter(t => t.completed).length

  // Handle toggle complete
  async function handleToggle(task) {
    await updateTask(task.id, { completed: !task.completed })
  }

  // Handle edit
  function handleEdit(task) {
    setEditingTask(task)
    setShowForm(true)
  }

  // Handle delete
  async function handleDelete(id) {
    await deleteTask(id)
  }

  // Handle form save
  async function handleSave(data) {
    if (editingTask) {
      await updateTask(editingTask.id, data)
    } else {
      await createTask(data)
    }
    setEditingTask(null)
  }

  return (
    <div className="tasks-page">
      {/* Greeting header */}
      <div className="greeting">
        <h1>You have {todayTasks.length} task{todayTasks.length === 1 ? '' : 's'} today to complete</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Progress bar */}
      <ProgressBar completed={completedToday} total={todayTasks.length} />

      {/* Search bar */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search tasks..." />

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

      {/* Clear completed */}
      {tasks.some(t => t.completed) && (
        <button onClick={clearCompleted} className="btn btn-danger btn-small">
          Clear completed
        </button>
      )}

      {/* Loading state */}
      {loading && <div className="loading">Loading tasks...</div>}

      {/* Task list */}
      <TaskList
        tasks={tasks}
        categories={categories}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={reorderTasks}
      />

      {/* FAB — floating action button */}
      <FAB onClick={() => { setEditingTask(null); setShowForm(true) }} />

      {/* Task form modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
