/**
 * PaneTile: one task as a glass tile — glyph badge, time line, title,
 * chips (priority, list, #tags), and actions (done, edit, delete).
 * The sortable version adds a drag handle (used for the "Anytime" tiles).
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from '../../shared/Icon'
import { toMinutes, formatDuration } from '../../shared/dates'
import { DEFAULT_TASK_COLOR } from '../../theme/colors'

export function timeLine(task) {
  if (!task.start_time) return 'Anytime'
  const start = toMinutes(task.start_time)
  const end = toMinutes(task.end_time)
  if (end > start) return `${task.start_time}–${task.end_time} · ${formatDuration(end - start)}`
  return task.start_time
}

function TileBody({ task, category, tags = [], note, late, onToggle, onEdit, onDelete, dragHandle }) {
  return (
    <article
      className={`tile ${task.completed ? 'is-done' : ''} ${late ? 'is-late' : ''}`}
      style={{ '--tint': task.color || DEFAULT_TASK_COLOR }}
    >
      <header className="tile-top">
        <span className="glyph"><Icon name={task.icon || 'target'} size={20} strokeWidth={2.2} /></span>
        <span className="tile-time">{note || timeLine(task)}</span>
        {dragHandle}
      </header>

      <button className="tile-title" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
        {task.title}
      </button>

      {(task.priority === 'high' || category || tags.length > 0) && (
        <div className="tile-chips">
          {task.priority === 'high' && <span className="tag tag-high">High</span>}
          {category && (
            <span className="tag"><span className="dot" style={{ background: category.color }} /> {category.name}</span>
          )}
          {tags.map(tag => <span key={tag.id} className="tag tag-hash">#{tag.name}</span>)}
        </div>
      )}

      <footer className="tile-actions">
        <button
          className={`tick ${task.completed ? 'on' : ''}`}
          onClick={() => onToggle(task)}
          aria-pressed={task.completed}
          aria-label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}
        >
          <Icon name="check" size={16} strokeWidth={3.5} /> {task.completed ? 'Done' : 'Mark done'}
        </button>
        <span className="tile-icons">
          <button className="icon-btn icon-btn-small" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit">
            <Icon name="edit" size={15} />
          </button>
          <button className="icon-btn icon-btn-small icon-btn-danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} title="Delete">
            <Icon name="trash" size={15} />
          </button>
        </span>
      </footer>
    </article>
  )
}

export function StaticTile(props) {
  return <TileBody {...props} />
}

export function SortableTile(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : 'auto', position: 'relative' }
  const handle = (
    <button className="grip" {...attributes} {...listeners} aria-label="Drag to reorder">
      <Icon name="grip" size={18} />
    </button>
  )
  return (
    <div ref={setNodeRef} style={style}>
      <TileBody {...props} dragHandle={handle} />
    </div>
  )
}
