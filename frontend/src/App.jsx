/**
 * App: main component with NavBar, page switching, and theme provider.
 */
import { useState } from 'react'
import { ThemeProvider } from './shared/ThemeContext'
import NavBar from './shared/NavBar'
import TasksPage from './features/tasks/TasksPage'
import NotesPage from './features/notes/NotesPage'
import './App.css'

function AppContent() {
  const [page, setPage] = useState('tasks')

  return (
    <div className="app">
      <NavBar page={page} setPage={setPage} />
      <main className="main-content">
        {page === 'tasks' ? <TasksPage /> : <NotesPage />}
      </main>
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
