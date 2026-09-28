/**
 * TaskCard: a single task card with colored left-edge accent stripe.
 * Supports drag-and-drop reordering via @dnd-kit.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CategoryBadge from '../categories/CategoryBadge'

export default function TaskCard({ task, category, onToggle, onEdit, onDelete }) {
  // Make this card draggable
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Priority colors
  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#22C55E',
  }

  // Due date badge
  const today = new Date().toISOString().split('T')[0]
  let dueBadge = null
  if (task.due_date) {
    if (task.due_date < today) {
      dueBadge = <span className="due-badge overdue">Overdue</span>
    } else if (task.due_date === today) {
      dueBadge = <span className="due-badge today">Due today</span>
    } else {
      const diff = Math.ceil((new Date(task.due_date) - new Date(today)) / (1000 * 60 * 60 * 24))
      dueBadge = <span className="due-badge upcoming">Due in {diff} day{diff === 1 ? '' : 's'}</span>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${task.completed ? 'completed' : ''}`}
    >
      {/* Colored left-edge accent stripe */}
      <div
        className="task-stripe"
        style={{ backgroundColor: category?.color || '#3B82F6' }}
      />

      {/* Drag handle */}
      <button className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        &#8942;
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Task content */}
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.description && <span className="task-desc">{task.description}</span>}

        <div className="task-meta">
          {/* Priority pill */}
          <span
            className="priority-pill"
            style={{
              backgroundColor: priorityColors[task.priority] + '22',
              color: priorityColors[task.priority],
            }}
          >
            {task.priority}
          </span>

          {/* Category badge */}
          {category && <CategoryBadge name={category.name} color={category.color} />}

          {/* Due date badge */}
          {dueBadge}

          {/* Recurrence indicator */}
          {task.recurrence !== 'none' && (
            <span className="recurrence-badge">&#8635; {task.recurrence}</span>
          )}

          {/* Alert indicator */}
          {task.alert_enabled && <span className="alert-badge">&#128276;</span>}
        </div>
      </div>

      {/* Action buttons */}
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
