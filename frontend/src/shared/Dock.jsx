/**
 * Dock: the floating glass navigation. Today · Week · (+) · Notes · Setup.
 * The + in the middle opens the composer from any page.
 */
import Icon from './Icon'

const LEFT = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'week', label: 'Week', icon: 'columns' },
]
const RIGHT = [
  { id: 'notes', label: 'Notes', icon: 'note' },
  { id: 'setup', label: 'Setup', icon: 'settings' },
]

export default function Dock({ view, onNavigate, onAdd }) {
  const item = it => (
    <button
      key={it.id}
      className={`dock-item ${view === it.id ? 'on' : ''}`}
      onClick={() => onNavigate(it.id)}
      aria-current={view === it.id ? 'page' : undefined}
    >
      <Icon name={it.icon} size={22} />
      <span>{it.label}</span>
    </button>
  )
  return (
    <nav className="dock" aria-label="Main">
      {LEFT.map(item)}
      <button className="dock-add" onClick={() => onAdd({})} aria-label="Add a task">
        <Icon name="plus" size={26} strokeWidth={3.2} />
      </button>
      {RIGHT.map(item)}
    </nav>
  )
}
