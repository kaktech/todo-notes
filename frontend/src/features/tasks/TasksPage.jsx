/**
 * TasksPage: three-panel layout.
 * Left: Sidebar. Middle: task list. Right: task detail panel.
 * Views: today, upcoming, overdue, calendar, notes, list-{id}, tag-{id}
 */
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../shared/Sidebar'
import TaskList from './TaskList'
import TaskDetailPanel from './TaskDetailPanel'
import CalendarView from './CalendarView'
import { useTasks } from './useTasks'
import { apiFetch } from '../../shared/api'

export default function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, reorderTasks, clearCompleted } = useTasks()

  const [view, setView] = useState('today')
  const [search, setSearch] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])

  // Fetch categories and tags on mount
  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    apiFetch(`/categories?user_id=${userId}`).then(r => r.json()).then(setCategories).catch(() => {})
    apiFetch(`/tags?user_id=${userId}`).then(r => r.json()).then(setTags).catch(() => {})
  }, [])

  // Fetch tasks based on current view
  const loadTasks = useCallback(() => {
    const params = {}
    if (search) params.search = search

    if (view === 'today') {
      params.date = new Date().toISOString().split('T')[0]
    } else if (view === 'upcoming') {
      params.filter = 'upcoming'
    } else if (view === 'overdue') {
      params.filter = 'overdue'
    } else if (view.startsWith('list-')) {
      params.category_id = parseInt(view.replace('list-', ''))
    } else if (view.startsWith('tag-')) {
      params.tag_id = parseInt(view.replace('tag-', ''))
    }

    fetchTasks(params)
  }, [view, search, fetchTasks])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Count tasks for sidebar badges
  const today = new Date().toISOString().split('T')[0]
  const taskCounts = {
    today: tasks.filter(t => t.due_date === today).length,
    upcoming: tasks.filter(t => !t.completed && t.due_date && t.due_date > today).length,
    overdue: tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length,
  }
  categories.forEach(cat => {
    taskCounts[`list-${cat.id}`] = tasks.filter(t => t.category_id === cat.id).length
  })

  // Get view title
  function getViewTitle() {
    if (view === 'today') return 'Today'
    if (view === 'upcoming') return 'Upcoming'
    if (view === 'overdue') return 'Overdue'
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
      const res = await apiFetch('/tasks', {
        method: 'POST',
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
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name, color }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
    }
  }

  // Handle deleting a category (tasks move to "No List")
  async function handleDeleteCategory(id) {
    const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== id))
      if (view === `list-${id}`) {
        setView('today')
        setSelectedTaskId(null)
      }
      await fetchTasks()
    }
  }

  // Handle adding a new tag
  async function handleAddTag(name) {
    const userId = localStorage.getItem('user_id')
    const res = await apiFetch('/tags', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name }),
    })
    if (res.ok) {
      const tag = await res.json()
      setTags(prev => [...prev, tag])
    }
  }

  // Find selected task object
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  // Calendar view shows all tasks for the current month
  const calendarTasks = view === 'calendar' ? tasks : []

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
        onDeleteCategory={handleDeleteCategory}
        onSearch={setSearch}
      />

      {/* Middle panel — task list or calendar */}
      <div className="task-panel">
        <h1 className="panel-heading">
          {getViewTitle()}
          {view !== 'calendar' && <span className="heading-count">{tasks.length}</span>}
        </h1>

        {error && <div className="error-banner">{error}</div>}

        {view === 'calendar' ? (
          <CalendarView tasks={calendarTasks} onToggle={handleToggle} />
        ) : (
          <>
            {/* Add new task row */}
            <button className="add-task-row" onClick={() => setSelectedTaskId('new')}>
              <span className="add-task-icon">+</span>
              <span>Add New Task</span>
            </button>

            {loading && <div className="loading">Loading tasks...</div>}

            <TaskList
              tasks={tasks}
              categories={categories}
              onToggle={handleToggle}
              onEdit={(task) => setSelectedTaskId(task.id)}
              onDelete={handleDelete}
              onReorder={reorderTasks}
              onSelect={(task) => setSelectedTaskId(task.id)}
            />

            {!loading && tasks.length === 0 && (
              <div className="empty-state">Nothing here yet</div>
            )}
          </>
        )}
      </div>

      {/* Right panel — task detail */}
      {selectedTaskId && view !== 'calendar' && (
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
