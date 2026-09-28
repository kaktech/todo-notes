/**
 * SubtaskList: checklist of subtasks for a task.
 * Shows "+ Add New Subtask" row, then the checklist below.
 */
import { useState } from 'react'
import SubtaskRow from './SubtaskRow'

export default function SubtaskList({ subtasks, onAdd, onToggle, onDelete, onTitleChange }) {
  const [newTitle, setNewTitle] = useState('')

  // Handle adding a new subtask
  async function handleAdd(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await onAdd(newTitle.trim())
    setNewTitle('')
  }

  return (
    <div className="subtask-list">
      <div className="subtask-section-title">Subtasks:</div>

      {/* Add new subtask row */}
      <form onSubmit={handleAdd} className="subtask-add-row">
        <span className="subtask-add-icon">+</span>
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add New Subtask"
          className="subtask-add-input"
        />
      </form>

      {/* Subtask checklist */}
      {subtasks.map(sub => (
        <SubtaskRow
          key={sub.id}
          subtask={sub}
          onToggle={onToggle}
          onDelete={onDelete}
          onTitleChange={onTitleChange}
        />
      ))}
    </div>
  )
}
