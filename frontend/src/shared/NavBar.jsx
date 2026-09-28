/**
 * NavBar: minimal top navigation with page links and dark/light toggle.
 * No heavy branding — just clean text links and a toggle switch.
 */
import { useTheme } from './ThemeContext'

export default function NavBar({ page, setPage }) {
  const { mode, toggle } = useTheme()

  return (
    <nav className="navbar">
      <div className="nav-links">
        <button
          className={page === 'tasks' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPage('tasks')}
        >
          Tasks
        </button>
        <button
          className={page === 'notes' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPage('notes')}
        >
          Notes
        </button>
      </div>

      {/* Dark/Light toggle switch */}
      <button
        className={`toggle-switch ${mode === 'dark' ? 'on' : ''}`}
        onClick={toggle}
        aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span className="toggle-circle" />
      </button>
    </nav>
  )
}
