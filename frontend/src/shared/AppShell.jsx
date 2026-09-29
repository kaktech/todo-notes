/**
 * AppShell: the logged-in app. Owns the shared data (tasks, lists, tags), the current
 * page, the selected date, and the New Task modal so every page can open it.
 */
import { useState, useEffect } from 'react'
import { getUserId } from './user'
import { todayStr } from './dates'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import TasksPage from '../features/tasks/TasksPage'
import NewTaskModal from '../features/tasks/NewTaskModal'
import { useTasks } from '../features/tasks/useTasks'
import NotesPage from '../features/notes/NotesPage'
import SettingsPage from '../features/settings/SettingsPage'
import { useCategories } from '../features/categories/useCategories'
import { useTags } from '../features/tags/useTags'

export default function AppShell() {
  const [userId] = useState(getUserId)
  const taskApi = useTasks(userId)
  const listApi = useCategories(userId)
  const tagApi = useTags(userId)

  // Tags on tasks change when tasks load/change and when the modal attaches or detaches tags
  const { fetchTaskTagMap } = tagApi
  useEffect(() => { fetchTaskTagMap() }, [fetchTaskTagMap, taskApi.tasks])

  const [page, setPage] = useState('timeline')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  // modal: null (closed) or { task: existing task | null, defaults: {date, start, duration} }
  const [modal, setModal] = useState(null)

  const openNewTask = (defaults = {}) => setModal({ task: null, defaults })
  const openEditTask = task => setModal({ task, defaults: {} })

  async function saveTask(payload, existing) {
    // Jump to the task's day so the user sees where it landed
    if (payload.due_date) setSelectedDate(payload.due_date)
    if (existing) {
      await taskApi.updateTask(existing.id, payload)
      return existing
    }
    return await taskApi.createTask(payload)
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewTask={openNewTask}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        tasks={taskApi.tasks}
      />

      <main className="main">
        {page === 'timeline' && (
          <TasksPage
            tasks={taskApi.tasks}
            loading={taskApi.loading}
            error={taskApi.error}
            categories={listApi.categories}
            tags={tagApi.tags}
            taskTagMap={tagApi.taskTagMap}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onToggle={task => taskApi.updateTask(task.id, { completed: !task.completed })}
            onReorder={taskApi.reorderTasks}
            onDelete={taskApi.deleteTask}
            onMoveToToday={task => taskApi.updateTask(task.id, { due_date: todayStr() })}
            onNewTask={openNewTask}
            onEditTask={openEditTask}
          />
        )}
        {page === 'notes' && <NotesPage userId={userId} />}
        {page === 'settings' && (
          <SettingsPage
            taskCount={taskApi.tasks.length}
            onDeleteAllTasks={taskApi.deleteAllTasks}
            listApi={listApi}
            tagApi={tagApi}
          />
        )}
      </main>

      <TabBar page={page} onNavigate={setPage} />

      {modal && (
        <NewTaskModal
          key={modal.task ? `edit-${modal.task.id}` : 'new'}
          task={modal.task}
          defaults={modal.defaults}
          categories={listApi.categories}
          tags={tagApi.tags}
          onCreateTag={tagApi.createTag}
          onSave={saveTask}
          onDelete={taskApi.deleteTask}
          onClose={() => { setModal(null); fetchTaskTagMap() }}
        />
      )}
    </div>
  )
}
