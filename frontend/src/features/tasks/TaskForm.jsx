/**
 * TaskForm: clean modal form matching the Modernist/Editorial style.
 * Big label text, clean input fields, no heavy borders.
 */
import { useState, useEffect } from 'react'
import CategoryPicker from '../categories/CategoryPicker'

export default function TaskForm({ task, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category_id: '',
    recurrence: 'none',
  })

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        priority: task.priority || 'medium',
        category_id: task.category_id || '',
        recurrence: task.recurrence || 'none',
      })
    }
  }, [task])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await onSave({ ...form, category_id: form.category_id || null })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-label">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="form-input"
            placeholder="What needs to be done?"
            required
          />

          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="form-textarea"
            placeholder="Add details..."
            rows={3}
          />

          <label className="form-label">Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
            className="form-input"
          />

          <label className="form-label">Priority</label>
          <div className="priority-pills">
            {['high', 'medium', 'low'].map(p => (
              <button
                key={p}
                type="button"
                className={`priority-btn ${form.priority === p ? 'active' : ''}`}
                onClick={() => setForm({ ...form, priority: p })}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <label className="form-label">Category</label>
          <CategoryPicker
            categories={categories}
            value={form.category_id}
            onChange={val => setForm({ ...form, category_id: val })}
          />

          <label className="form-label">Repeat</label>
          <select
            value={form.recurrence}
            onChange={e => setForm({ ...form, recurrence: e.target.value })}
            className="form-input"
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
