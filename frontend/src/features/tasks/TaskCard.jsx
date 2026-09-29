/**
 * TaskCard: compact task row with checkbox, title, description, and optional meta.
 * Priority is NOT shown here — it belongs in the detail panel.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Due date badge — minimal text only
  const today = new Date().toISOString().split('T')[0]
  let dueBadge = null
  if (task.due_date && !task.completed) {
    if (task.due_date < today) {
      dueBadge = <span className="due-badge overdue">Overdue</span>
    } else if (task.due_date === today) {
      dueBadge = <span className="due-badge">Today</span>
    }
  }

  return (
    <div ref={setNodeRef} style={style} className={`task-card ${task.completed ? 'completed' : ''}`}>
      {/* Drag handle */}
      <button className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        &#8942;
      </button>

      {/* Rounded square checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Task content — title + description (clean, separate lines) */}
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.description && <span className="task-desc">{task.description}</span>}
        {dueBadge && <div className="task-meta">{dueBadge}</div>}
      </div>

      {/* Action buttons — appear on hover */}
      <div className="task-actions">
        <button onClick={() => onEdit(task)} className="btn-icon" title="Edit" aria-label="Edit task">
          &#9998;
        </button>
        <button onClick={() => onDelete(task.id)} className="btn-icon btn-delete" title="Delete" aria-label="Delete task">
          &#10005;
        </button>
      </div>
    </div>
  )
}
