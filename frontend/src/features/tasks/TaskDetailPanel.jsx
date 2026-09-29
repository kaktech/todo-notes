/**
 * TaskDetailPanel: right panel for viewing/editing a task.
 * Shows title, description, list, due date, tags, and subtasks.
 * Opens when a task is clicked, or blank for a new task.
 */
import { useState, useEffect } from 'react'
import TagPicker from '../tags/TagPicker'
import SubtaskList from '../subtasks/SubtaskList'

export default function TaskDetailPanel({
  task,
  categories,
  tags,
  onSave,
  onDelete,
  onClose,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtask,
  onAttachTag,
  onDetachTag,
}) {
  // Local form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    due_date: '',
  })
  const [subtasks, setSubtasks] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [pendingTags, setPendingTags] = useState([]) // tags to attach after new task is saved
  const [hasChanges, setHasChanges] = useState(false)

  // Load task data when task changes
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        category_id: task.category_id || '',
        due_date: task.due_date || '',
      })
      // Load subtasks
      fetch(`/api/tasks/${task.id}/subtasks`)
        .then(r => r.json())
        .then(setSubtasks)
        .catch(() => {})
      // Load tags for this task
      fetch(`/api/tags/tasks/${task.id}`)
        .then(r => r.json())
        .then(tags => setSelectedTagIds(tags.map(t => t.id)))
        .catch(() => {})
    } else {
      setForm({ title: '', description: '', category_id: '', due_date: '' })
      setSubtasks([])
      setSelectedTagIds([])
    }
    setHasChanges(false)
  }, [task?.id])

  // Track changes
  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // Handle save
  async function handleSave() {
    if (!form.title.trim()) return
    // Send title and description as separate, explicit fields
    const result = await onSave({
      title: form.title,
      description: form.description,
      category_id: form.category_id || null,
      due_date: form.due_date || null,
    })
    // If this was a new task and we have pending tags, attach them now
    if (result && result.id && pendingTags.length > 0) {
      for (const tagId of pendingTags) {
        await fetch(`/api/tags/tasks/${result.id}/tags/${tagId}`, { method: 'POST' })
      }
      setPendingTags([])
    }
    setHasChanges(false)
  }

  // Handle close with confirm if unsaved changes
  function handleClose() {
    if (hasChanges) {
      if (window.confirm('Discard unsaved changes?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // Handle subtask operations
  async function handleAddSubtask(title) {
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const sub = await res.json()
      setSubtasks(prev => [...prev, sub])
    }
  }

  async function handleToggleSubtask(subtask) {
    const res = await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !subtask.completed }),
    })
    if (res.ok) {
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s))
    }
  }

  async function handleDeleteSubtask(id) {
    await fetch(`/api/subtasks/${id}`, { method: 'DELETE' })
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  async function handleUpdateSubtask(subtask, title) {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, title } : s))
  }

  // Handle tag operations
  async function handleAttachTag(tagId) {
    if (task) {
      // Existing task: attach immediately
      await fetch(`/api/tags/tasks/${task.id}/tags/${tagId}`, { method: 'POST' })
      setSelectedTagIds(prev => [...prev, tagId])
    } else {
      // New task: store as pending, will attach after save
      setPendingTags(prev => [...prev, tagId])
      setSelectedTagIds(prev => [...prev, tagId])
    }
  }

  async function handleDetachTag(tagId) {
    if (task) {
      // Existing task: detach immediately
      await fetch(`/api/tags/tasks/${task.id}/tags/${tagId}`, { method: 'DELETE' })
      setSelectedTagIds(prev => prev.filter(id => id !== tagId))
    } else {
      // New task: remove from pending
      setPendingTags(prev => prev.filter(id => id !== tagId))
      setSelectedTagIds(prev => prev.filter(id => id !== tagId))
    }
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h2 className="detail-title">Task:</h2>
        <button className="detail-close" onClick={handleClose} aria-label="Close panel">&times;</button>
      </div>

      <div className="detail-body">
        {/* Title input */}
        <input
          type="text"
          value={form.title}
          onChange={e => updateForm('title', e.target.value)}
          className="detail-title-input"
          placeholder="Task title"
        />

        {/* Description textarea */}
        <label className="detail-label">Description</label>
        <textarea
          value={form.description}
          onChange={e => updateForm('description', e.target.value)}
          className="detail-textarea"
          placeholder="Add description..."
          rows={4}
        />

        {/* List dropdown */}
        <div className="detail-row">
          <label className="detail-label">List</label>
          <select
            value={form.category_id}
            onChange={e => updateForm('category_id', e.target.value)}
            className="detail-select"
          >
            <option value="">None</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div className="detail-row">
          <label className="detail-label">Due date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => updateForm('due_date', e.target.value)}
            className="detail-date"
          />
        </div>

        {/* Tags */}
        <TagPicker
          tags={tags}
          selectedTagIds={selectedTagIds}
          onAttach={handleAttachTag}
          onDetach={handleDetachTag}
        />

        {/* Subtasks */}
        <SubtaskList
          subtasks={subtasks}
          onAdd={handleAddSubtask}
          onToggle={handleToggleSubtask}
          onDelete={handleDeleteSubtask}
          onTitleChange={handleUpdateSubtask}
        />
      </div>

      {/* Bottom buttons */}
      <div className="detail-actions">
        <button onClick={() => onDelete(task.id)} className="btn btn-outline">
          Delete Task
        </button>
        <button onClick={handleSave} className="btn btn-accent">
          Save changes
        </button>
      </div>
    </div>
  )
}
