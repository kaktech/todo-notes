/**
 * TaskCard: one task on the timeline, as a glass card.
 * Shows icon badge, time/date line, title, list + tag chips, edit/delete buttons, check circle.
 * Untimed cards can be dragged (sortable); timed cards are ordered by start time.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from '../../shared/Icon'
import { toMinutes, formatDuration, fromDateStr, todayStr, MONTHS } from '../../shared/dates'
import { DEFAULT_TASK_COLOR } from '../../theme/colors'

function daysLate(dueDate) {
  const ms = fromDateStr(todayStr()) - fromDateStr(dueDate)
  return Math.round(ms / 86400000)
}

function TaskCardBody({ task, category, tags = [], overdue, onToggle, onOpen, onDelete, onMoveToToday, dragHandle }) {
  const start = toMinutes(task.start_time)
  const end = toMinutes(task.end_time)

  let meta = null
  if (overdue) {
    const d = fromDateStr(task.due_date)
    const late = daysLate(task.due_date)
    meta = `DUE ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()} · ${late} DAY${late === 1 ? '' : 'S'} LATE`
  } else if (task.start_time) {
    meta = task.end_time
      ? `${task.start_time}-${task.end_time}${end > start ? ` · ${formatDuration(end - start)}` : ''}`
      : task.start_time
  } else if (!task.due_date) {
    meta = 'ANY DAY'
  }

  return (
    <article
      className={`task-card ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
      style={{ '--task-color': task.color || DEFAULT_TASK_COLOR }}
    >
      {dragHandle}
      <span className="task-badge">
        <Icon name={task.icon || 'star'} size={24} strokeWidth={2.2} />
      </span>

      <div className="task-body">
        <button className="task-open" onClick={() => onOpen(task)} aria-label={`Edit task ${task.title}`}>
          {meta && <span className="task-meta">{meta}</span>}
          <span className="task-title">{task.title}</span>
        </button>

        <div className="task-foot">
          <div className="task-chips">
            {task.priority === 'high' && <span className="chip-tag chip-high">HIGH</span>}
            {category && (
              <span className="chip-tag chip-list">
                <span className="dot" style={{ background: category.color }} /> {category.name}
              </span>
            )}
            {tags.map(tag => <span key={tag.id} className="chip-tag chip-hash">#{tag.name}</span>)}
          </div>
          <div className="task-actions">
            {overdue && (
              <button className="icon-btn icon-btn-small" onClick={() => onMoveToToday(task)} aria-label={`Move "${task.title}" to today`} title="Move to today">
                <Icon name="calendar" size={15} />
              </button>
            )}
            <button className="icon-btn icon-btn-small" onClick={() => onOpen(task)} aria-label={`Edit "${task.title}"`} title="Edit">
              <Icon name="edit" size={15} />
            </button>
            <button className="icon-btn icon-btn-small icon-btn-danger" onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`} title="Delete">
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>
      </div>

      <button
        className={`check-circle ${task.completed ? 'done' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        aria-pressed={task.completed}
      >
        {task.completed && <Icon name="check" size={18} strokeWidth={3.5} />}
      </button>
    </article>
  )
}

export function StaticTaskCard(props) {
  return <TaskCardBody {...props} />
}

export function SortableTaskCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : 'auto', position: 'relative' }
  const handle = (
    <button className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
      <Icon name="grip" size={18} />
    </button>
  )
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardBody {...props} dragHandle={handle} />
    </div>
  )
}
