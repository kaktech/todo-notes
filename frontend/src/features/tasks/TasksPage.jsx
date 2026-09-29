/**
 * TasksPage: three-panel layout.
 * Left: Sidebar. Middle: task list. Right: task detail panel.
 */
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../shared/Sidebar'
import TaskList from './TaskList'
import TaskDetailPanel from './TaskDetailPanel'
import { useTasks } from './useTasks'

export default function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, clearCompleted } = useTasks()

  const [view, setView] = useState('today') // today, upcoming, calendar, notes, list-{id}, tag-{id}
  const [search, setSearch] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])

  // Fetch categories and tags on mount
  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    fetch(`/api/categories?user_id=${userId}`).then(r => r.json()).then(setCategories).catch(() => {})
    fetch(`/api/tags?user_id=${userId}`).then(r => r.json()).then(setTags).catch(() => {})
  }, [])

  // Fetch tasks based on current view
  const loadTasks = useCallback(() => {
    const params = {}
    if (search) params.search = search

    if (view === 'upcoming') {
      params.filter = 'active'
    } else if (view.startsWith('list-')) {
      params.category_id = parseInt(view.replace('list-', ''))
    } else if (view.startsWith('tag-')) {
      params.tag_id = parseInt(view.replace('tag-', ''))
    }
    // "today" view shows all tasks (no date filter) so nothing appears empty

    fetchTasks(params)
  }, [view, search, fetchTasks])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Filter for upcoming (future dates, incomplete)
  const displayTasks = view === 'upcoming'
    ? tasks.filter(t => !t.completed && t.due_date && t.due_date > new Date().toISOString().split('T')[0])
    : tasks

  // Count tasks for sidebar badges
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const taskCounts = {
    today: tasks.filter(t => t.due_date === today).length,
    upcoming: tasks.filter(t => !t.completed && t.due_date && t.due_date > today).length,
  }
  categories.forEach(cat => {
    taskCounts[`list-${cat.id}`] = tasks.filter(t => t.category_id === cat.id).length
  })

  // Get view title
  function getViewTitle() {
    if (view === 'today') return 'Today'
    if (view === 'upcoming') return 'Upcoming'
    if (view === 'calendar') return 'Calendar'
    if (view === 'notes') return 'Notes'
    if (view.startsWith('list-')) {
      const cat = categories.find(c => `list-${c.id}` === view)
      return cat ? cat.name : 'Tasks'
    }
    if (view.startsWith('tag-')) {
      const tag = tags.find(t => `tag-${t.id}` === view)
      return tag ? tag.name : 'Tasks'
    }
    return 'Tasks'
  }

  // Handle task operations
  async function handleToggle(task) {
    await updateTask(task.id, { completed: !task.completed })
  }

  async function handleDelete(id) {
    await deleteTask(id)
    if (selectedTaskId === id) setSelectedTaskId(null)
  }

  async function handleSave(data) {
    if (selectedTaskId && selectedTaskId !== 'new') {
      await updateTask(selectedTaskId, data)
      return null
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, user_id: localStorage.getItem('user_id') }),
      })
      if (!res.ok) throw new Error('Failed to create task')
      const newTask = await res.json()
      await fetchTasks()
      return newTask
    }
  }

  // Handle adding a new category
  async function handleAddCategory(name, color = '#3B82F6') {
    const userId = localStorage.getItem('user_id')
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name, color }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
    }
  }

  // Handle adding a new tag
  async function handleAddTag(name) {
    const userId = localStorage.getItem('user_id')
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name }),
    })
    if (res.ok) {
      const tag = await res.json()
      setTags(prev => [...prev, tag])
    }
  }

  // Find selected task object
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  return (
    <div className="tasks-page">
      {/* Left sidebar */}
      <Sidebar
        view={view}
        onViewChange={(v) => { setView(v); setSelectedTaskId(null) }}
        categories={categories}
        tags={tags}
        taskCounts={taskCounts}
        onAddCategory={handleAddCategory}
        onAddTag={handleAddTag}
        onSearch={setSearch}
      />

      {/* Middle panel — task list */}
      <div className="task-panel">
        <h1 className="panel-heading">
          {getViewTitle()}
          <span className="heading-count">{displayTasks.length}</span>
        </h1>

        {error && <div className="error-banner">{error}</div>}

        {/* Add new task row */}
        <button className="add-task-row" onClick={() => setSelectedTaskId('new')}>
          <span className="add-task-icon">+</span>
          <span>Add New Task</span>
        </button>

        {loading && <div className="loading">Loading tasks...</div>}

        <TaskList
          tasks={displayTasks}
          categories={categories}
          onToggle={handleToggle}
          onEdit={(task) => setSelectedTaskId(task.id)}
          onDelete={handleDelete}
          onReorder={reorderTasks}
          onSelect={(task) => setSelectedTaskId(task.id)}
        />

        {!loading && displayTasks.length === 0 && (
          <div className="empty-state">Nothing here yet</div>
        )}
      </div>

      {/* Right panel — task detail */}
      {selectedTaskId && (
        <TaskDetailPanel
          task={selectedTaskId === 'new' ? null : selectedTask}
          categories={categories}
          tags={tags}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}
