/**
 * TopNav (laptops): brand, glass nav tabs, and an Add task button.
 * Phones use the floating Dock instead; CSS shows one or the other.
 */
import Icon from './Icon'

const ITEMS = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'week', label: 'Week', icon: 'columns' },
  { id: 'notes', label: 'Notes', icon: 'note' },
  { id: 'setup', label: 'Setup', icon: 'settings' },
]

export default function TopNav({ view, onNavigate, onAdd }) {
  return (
    <header className="topnav">
      <div className="topnav-brand">
        <span className="brand-mark" aria-hidden="true">P</span>
        <span className="brand-name">Pane</span>
      </div>
      <nav className="topnav-tabs" aria-label="Main">
        {ITEMS.map(it => (
          <button
            key={it.id}
            className={`topnav-tab ${view === it.id ? 'on' : ''}`}
            onClick={() => onNavigate(it.id)}
            aria-current={view === it.id ? 'page' : undefined}
          >
            <Icon name={it.icon} size={18} /> {it.label}
          </button>
        ))}
      </nav>
      <button className="btn btn-primary" onClick={() => onAdd({})}>
        <Icon name="plus" size={18} strokeWidth={3} /> Add task
      </button>
    </header>
  )
}
