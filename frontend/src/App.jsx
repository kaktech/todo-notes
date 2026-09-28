/**
 * App: three-panel layout with sidebar, task list, and detail panel.
 * No top nav bar — navigation is in the sidebar.
 */
import { useState } from 'react'
import { ThemeProvider } from './shared/ThemeContext'
import TasksPage from './features/tasks/TasksPage'
import NotesPage from './features/notes/NotesPage'
import './App.css'

function AppContent() {
  const [page, setPage] = useState('tasks')

  return (
    <div className="app">
      {page === 'tasks' ? (
        <TasksPage />
      ) : (
        <NotesPage />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
