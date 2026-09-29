/**
 * EmptyState + IconBadge: the shared "blue badge + heading + text + pill button" pattern.
 */
import Icon from './Icon'

export function IconBadge({ name = 'sparkle', size = 34 }) {
  return (
    <span className="icon-badge" style={{ '--badge-size': `${size + 34}px` }}>
      <Icon name={name} size={size} strokeWidth={2.2} />
    </span>
  )
}

export default function EmptyState({ icon = 'sparkle', title, text, actionLabel, onAction }) {
  return (
    <div className="empty-card">
      <IconBadge name={icon} />
      <h2 className="empty-title">{title}</h2>
      <p className="empty-text">{text}</p>
      {actionLabel && (
        <button className="btn btn-primary btn-pill" onClick={onAction}>
          <Icon name="plus" size={18} strokeWidth={3} /> {actionLabel}
        </button>
      )}
    </div>
  )
}
