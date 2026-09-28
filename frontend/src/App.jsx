/*
 * Main App component.
 * Contains the navigation bar and switches between Tasks and Notes pages.
 */
import { useState, useEffect } from 'react'
import TasksPage from './TasksPage'
import NotesPage from './NotesPage'
import './App.css'

// Work out which page to show by looking at the address bar.
// This way /notes still opens the Notes page after a refresh.
function pageFromUrl() {
  return window.location.pathname === '/notes' ? 'notes' : 'tasks'
}

function App() {
  // Track which page is showing: 'tasks' or 'notes'
  const [page, setPage] = useState(pageFromUrl)

  // Handle the browser Back / Forward buttons
  useEffect(() => {
    const onPop = () => setPage(pageFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Switch page, and keep the address bar in step so refresh works.
  // (We use the plain History API so we don't need a routing library.)
  function goTo(nextPage) {
    setPage(nextPage)
    window.history.pushState({}, '', nextPage === 'notes' ? '/notes' : '/tasks')
  }

  return (
    <div className="app">
      {/* Top navigation bar */}
      <nav className="navbar">
        <div className="nav-brand">My Todo App</div>
        <div className="nav-links">
          <button
            className={page === 'tasks' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => goTo('tasks')}
          >
            Tasks
          </button>
          <button
            className={page === 'notes' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => goTo('notes')}
          >
            Notes
          </button>
        </div>
      </nav>

      {/* Show the selected page */}
      <main className="main-content">
        {page === 'tasks' ? <TasksPage /> : <NotesPage />}
      </main>
    </div>
  )
}

export default App
