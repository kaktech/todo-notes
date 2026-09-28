/**
 * TaskForm: modal form for creating or editing a task.
 * Includes all fields: title, description, times, due date, priority,
 * category, recurrence, and alert toggle.
 */
import { useState, useEffect } from 'react'
import CategoryPicker from '../categories/CategoryPicker'

export default function TaskForm({ task, categories, onSave, onClose }) {
  // If editing, pre-fill with existing task data
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    due_date: '',
    priority: 'medium',
    category_id: '',
    recurrence: 'none',
    alert_enabled: false,
  })

  // Populate form when editing an existing task
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        start_time: task.start_time || '',
        end_time: task.end_time || '',
        due_date: task.due_date || '',
        priority: task.priority || 'medium',
        category_id: task.category_id || '',
        recurrence: task.recurrence || 'none',
        alert_enabled: task.alert_enabled || false,
      })
    }
  }, [task])

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await onSave({
      ...form,
      category_id: form.category_id || null,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{task ? 'Edit Task' : 'Create New Task'}</h2>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <label className="form-label">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="form-input"
            placeholder="What needs to be done?"
            required
          />

          {/* Description */}
          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="form-textarea"
            placeholder="Add details..."
            rows={3}
          />

          {/* Time range */}
          <div className="form-row">
            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Due date */}
          <label className="form-label">Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
            className="form-input"
          />

          {/* Priority pills */}
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

          {/* Category */}
          <label className="form-label">Category</label>
          <CategoryPicker
            categories={categories}
            value={form.category_id}
            onChange={val => setForm({ ...form, category_id: val })}
          />

          {/* Recurrence */}
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

          {/* Alert toggle */}
          <div className="form-toggle-row">
            <span>Enable Alert</span>
            <button
              type="button"
              className={`toggle-switch ${form.alert_enabled ? 'on' : ''}`}
              onClick={() => setForm({ ...form, alert_enabled: !form.alert_enabled })}
            >
              <span className="toggle-circle" />
            </button>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
