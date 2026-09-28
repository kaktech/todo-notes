/**
 * TasksPage: big "Today" heading, horizontal date pills,
 * tasks grouped by category with uppercase section labels.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTasks } from './useTasks'
import TaskList from './TaskList'
import TaskForm from './TaskForm'
import DatePicker from './DatePicker'
import SearchBar from '../../shared/SearchBar'
import FAB from '../../shared/FAB'

export default function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, clearCompleted } = useTasks()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch categories once on mount
  useEffect(() => {
    fetch('/api/categories?user_id=' + localStorage.getItem('user_id'))
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Fetch tasks when filter, search, or date changes
  const loadTasks = useCallback(() => {
    const params = { date: selectedDate }
    if (filter !== 'all') params.filter = filter
    if (search) params.search = search
    fetchTasks(params)
  }, [filter, search, selectedDate, fetchTasks])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Progress for selected date
  const dayTasks = tasks.filter(t => t.due_date === selectedDate)
  const completedToday = dayTasks.filter(t => t.completed).length

  // Group tasks by category
  const grouped = {}
  const uncategorized = []
  tasks.forEach(task => {
    if (task.category_id) {
      if (!grouped[task.category_id]) grouped[task.category_id] = []
      grouped[task.category_id].push(task)
    } else {
      uncategorized.push(task)
    }
  })

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
      await createTask({ ...data, due_date: data.due_date || selectedDate })
    }
    setEditingTask(null)
  }

  return (
    <div className="tasks-page">
      {/* Big bold heading */}
      <h1 className="page-heading">Today</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Progress text */}
      <p className="progress-text">{completedToday} of {dayTasks.length} completed today</p>

      {/* Date picker — horizontal pill row */}
      <DatePicker selectedDate={selectedDate} onSelect={setSelectedDate} />

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

      {/* Tasks grouped by category */}
      {categories.map(cat => {
        const catTasks = grouped[cat.id] || []
        if (catTasks.length === 0) return null
        return (
          <div key={cat.id}>
            <div className="section-label">{cat.name}</div>
            <TaskList
              tasks={catTasks}
              categories={categories}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={reorderTasks}
            />
          </div>
        )
      })}

      {/* Uncategorized tasks */}
      {uncategorized.length > 0 && (
        <div>
          <div className="section-label">Tasks</div>
          <TaskList
            tasks={uncategorized}
            categories={categories}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReorder={reorderTasks}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="empty-state">Nothing here yet</div>
      )}

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
