/**
 * TaskDetailPanel: right panel for viewing/editing a task.
 * Shows title, description, list, due date, and tags.
 * Opens when a task is clicked, or blank for a new task.
 */
import { useState, useEffect } from 'react'
import TagPicker from '../tags/TagPicker'
import { apiFetch } from '../../shared/api'

export default function TaskDetailPanel({
  task,
  categories,
  tags,
  onSave,
  onDelete,
  onClose,
  mobileOpen,
  onOpenMobile,
}) {
  // Local form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    due_date: '',
  })
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [pendingTags, setPendingTags] = useState([])
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
      // Load tags for this task
      apiFetch(`/tags/tasks/${task.id}`)
        .then(r => r.json())
        .then(tags => setSelectedTagIds(tags.map(t => t.id)))
        .catch(() => {})
    } else {
      setForm({ title: '', description: '', category_id: '', due_date: '' })
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
    const result = await onSave({
      title: form.title,
      description: form.description,
      category_id: form.category_id || null,
      due_date: form.due_date || null,
    })
    // If this was a new task and we have pending tags, attach them now
    if (result && result.id && pendingTags.length > 0) {
      for (const tagId of pendingTags) {
        await apiFetch(`/tags/tasks/${result.id}/tags/${tagId}`, { method: 'POST' })
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

  // Handle tag operations
  async function handleAttachTag(tagId) {
    if (task) {
      await apiFetch(`/tags/tasks/${task.id}/tags/${tagId}`, { method: 'POST' })
      setSelectedTagIds(prev => [...prev, tagId])
    } else {
      setPendingTags(prev => [...prev, tagId])
      setSelectedTagIds(prev => [...prev, tagId])
    }
  }

  async function handleDetachTag(tagId) {
    if (task) {
      await apiFetch(`/tags/tasks/${task.id}/tags/${tagId}`, { method: 'DELETE' })
      setSelectedTagIds(prev => prev.filter(id => id !== tagId))
    } else {
      setPendingTags(prev => prev.filter(id => id !== tagId))
      setSelectedTagIds(prev => prev.filter(id => id !== tagId))
    }
  }

  // Handle tag creation
  async function handleCreateTag(name) {
    const userId = localStorage.getItem('user_id')
    const res = await apiFetch('/tags', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name }),
    })
    if (!res.ok) throw new Error('Failed to create tag')
    return await res.json()
  }

  return (
    <div className={`detail-panel ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="detail-header">
        <button className="detail-back-btn" onClick={onClose} aria-label="Go back">&#8592; Back</button>
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
          onCreate={handleCreateTag}
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
