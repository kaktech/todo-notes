/**
 * AppShell: the whole app. Owns the shared data (tasks, lists, tags), the current view,
 * and the composer so every view can open it. Navigation is the floating Dock.
 */
import { useState, useEffect } from 'react'
import { getUserId } from './user'
import { useNow } from './useNow'
import Dock from './Dock'
import TodayView from '../features/today/TodayView'
import WeekBoard from '../features/week/WeekBoard'
import Composer from '../features/composer/Composer'
import NotesPage from '../features/notes/NotesPage'
import SettingsPage from '../features/settings/SettingsPage'
import { useTasks } from '../features/tasks/useTasks'
import { useCategories } from '../features/categories/useCategories'
import { useTags } from '../features/tags/useTags'

export default function AppShell() {
  const [userId] = useState(getUserId)
  const now = useNow()
  const taskApi = useTasks(userId)
  const listApi = useCategories(userId)
  const tagApi = useTags(userId)

  // Tags on tasks change when tasks load/change and when the composer attaches or detaches tags
  const { fetchTaskTagMap } = tagApi
  useEffect(() => { fetchTaskTagMap() }, [fetchTaskTagMap, taskApi.tasks])

  const [view, setView] = useState('today')
  // composer: null (closed) or { task: existing task | null, defaults: {title, date, start, duration, timed} }
  const [composer, setComposer] = useState(null)

  const openComposer = (defaults = {}) => setComposer({ task: null, defaults })
  const editTask = task => setComposer({ task, defaults: {} })

  async function saveTask(payload, existing) {
    if (existing) {
      await taskApi.updateTask(existing.id, payload)
      return existing
    }
    return await taskApi.createTask(payload)
  }

  const toggle = task => taskApi.updateTask(task.id, { completed: !task.completed })

  return (
    <div className="shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">P</span>
        <span className="brand-name">Pane</span>
      </header>

      <main className="main">
        {view === 'today' && (
          <TodayView
            tasks={taskApi.tasks}
            loading={taskApi.loading}
            error={taskApi.error}
            categories={listApi.categories}
            tags={tagApi.tags}
            taskTagMap={tagApi.taskTagMap}
            now={now}
            onToggle={toggle}
            onUpdate={taskApi.updateTask}
            onReorder={taskApi.reorderTasks}
            onDelete={taskApi.deleteTask}
            onCompose={openComposer}
            onEdit={editTask}
          />
        )}
        {view === 'week' && (
          <WeekBoard
            tasks={taskApi.tasks}
            onToggle={toggle}
            onUpdate={taskApi.updateTask}
            onEdit={editTask}
            onCompose={openComposer}
          />
        )}
        {view === 'notes' && <NotesPage userId={userId} />}
        {view === 'setup' && (
          <SettingsPage
            taskCount={taskApi.tasks.length}
            onDeleteAllTasks={taskApi.deleteAllTasks}
            listApi={listApi}
            tagApi={tagApi}
          />
        )}
      </main>

      <Dock view={view} onNavigate={setView} onAdd={openComposer} />

      {composer && (
        <Composer
          key={composer.task ? `edit-${composer.task.id}` : 'new'}
          task={composer.task}
          defaults={composer.defaults}
          categories={listApi.categories}
          tags={tagApi.tags}
          onCreateTag={tagApi.createTag}
          onSave={saveTask}
          onDelete={taskApi.deleteTask}
          onClose={() => { setComposer(null); fetchTaskTagMap() }}
        />
      )}
    </div>
  )
}
