/**
 * SubtaskRow: a single subtask with checkbox, text, and delete option.
 */
export default function SubtaskRow({ subtask, onToggle, onDelete, onTitleChange }) {
  return (
    <div className={`subtask-row ${subtask.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={() => onToggle(subtask)}
        className="subtask-checkbox"
        aria-label={`Mark "${subtask.title}" as ${subtask.completed ? 'incomplete' : 'complete'}`}
      />
      <input
        type="text"
        value={subtask.title}
        onChange={e => onTitleChange(subtask, e.target.value)}
        className="subtask-input"
      />
      <button
        className="subtask-delete"
        onClick={() => onDelete(subtask.id)}
        aria-label={`Delete subtask "${subtask.title}`}
      >
        &times;
      </button>
    </div>
  )
}
