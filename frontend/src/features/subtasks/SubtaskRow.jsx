/**
 * SubtaskRow: one subtask with a checkbox, its title, and a delete button.
 */
import Icon from '../../shared/Icon'

export default function SubtaskRow({ subtask, onToggle, onDelete }) {
  return (
    <div className={`subtask-row ${subtask.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={() => onToggle(subtask)}
        className="subtask-checkbox"
        aria-label={`Mark "${subtask.title}" as ${subtask.completed ? 'incomplete' : 'complete'}`}
      />
      <span className="subtask-title">{subtask.title}</span>
      <button
        type="button"
        className="icon-btn icon-btn-small"
        onClick={() => onDelete(subtask)}
        aria-label={`Delete subtask "${subtask.title}"`}
      >
        <Icon name="x" size={14} strokeWidth={3} />
      </button>
    </div>
  )
}
