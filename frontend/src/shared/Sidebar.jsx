/**
 * Sidebar (desktop): logo, + NEW TASK, nav links, mini calendar.
 * Hidden on mobile, where TabBar takes over.
 */
import Icon from './Icon'
import MiniCalendar from './MiniCalendar'

const NAV_ITEMS = [
  { id: 'timeline', label: 'Timeline', icon: 'calendar' },
  { id: 'notes', label: 'Notes', icon: 'note' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export default function Sidebar({ page, onNavigate, onNewTask, selectedDate, onSelectDate, tasks }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark" />
        <span className="logo-text">TaskFlow</span>
      </div>

      <button className="btn btn-primary btn-block btn-lg" onClick={() => onNewTask({ date: selectedDate })}>
        <Icon name="plus" size={20} strokeWidth={3.5} /> NEW TASK
      </button>

      <nav className="sidebar-nav" aria-label="Main">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-link ${page === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </button>
        ))}
      </nav>

      <MiniCalendar
        selectedDate={selectedDate}
        tasks={tasks}
        onSelect={date => { onSelectDate(date); onNavigate('timeline') }}
      />
    </aside>
  )
}
