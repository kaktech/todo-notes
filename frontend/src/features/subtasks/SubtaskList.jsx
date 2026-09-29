/**
 * SubtaskList: add box + checklist. The parent decides how to store subtasks
 * (live API calls for saved tasks, local state for a brand-new task).
 */
import { useState } from 'react'
import SubtaskRow from './SubtaskRow'

export default function SubtaskList({ subtasks, onAdd, onToggle, onDelete }) {
  const [newTitle, setNewTitle] = useState('')

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    await onAdd(title)
    setNewTitle('')
  }

  return (
    <div className="subtask-list">
      {subtasks.map(sub => (
        <SubtaskRow key={sub.id} subtask={sub} onToggle={onToggle} onDelete={onDelete} />
      ))}
      {/* Not a <form>: this sits inside the task form and nested forms are invalid */}
      <div className="subtask-add-row">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Add a subtask"
          className="field-input"
        />
        <button type="button" className="btn btn-small" onClick={handleAdd}>Add</button>
      </div>
    </div>
  )
}
