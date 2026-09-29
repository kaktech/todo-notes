/**
 * TabBar (mobile): bottom tabs Notes / Timeline / Settings.
 */
import Icon from './Icon'

const TABS = [
  { id: 'notes', label: 'Notes', icon: 'note' },
  { id: 'timeline', label: 'Timeline', icon: 'calendar' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export default function TabBar({ page, onNavigate }) {
  return (
    <>
    {/* Soft fade so scrolling content does not show through the gaps around the bar */}
    <div className="tab-bar-fade" aria-hidden="true" />
    <nav className="tab-bar" aria-label="Main">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab ${page === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
          aria-current={page === tab.id ? 'page' : undefined}
        >
          <Icon name={tab.icon} size={24} />
          <span>{tab.label.toUpperCase()}</span>
        </button>
      ))}
    </nav>
    </>
  )
}
