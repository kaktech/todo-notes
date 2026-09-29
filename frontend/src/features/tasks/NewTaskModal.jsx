/**
 * NewTaskModal: create OR edit a task, in the Glass style.
 * Main part: title, when (timeline/inbox), date, start, duration, colour, icon.
 * "More options": description, list, priority, repeat, tags, subtasks.
 *
 * Title and description are separate state on purpose (past bug: they got merged).
 * Tags and subtasks for a NEW task are held locally and sent only after the task
 * exists and has a real id (past bug: attaching tags with no id).
 */
import { useState, useEffect, useRef } from 'react'
import Icon, { TASK_ICONS } from '../../shared/Icon'
import { TASK_COLORS, DEFAULT_TASK_COLOR } from '../../theme/colors'
import { toMinutes, fromMinutes, formatDuration } from '../../shared/dates'
import { apiFetch } from '../../shared/api'
import CategoryPicker from '../categories/CategoryPicker'
import TagPicker from '../tags/TagPicker'
import SubtaskList from '../subtasks/SubtaskList'

const DURATIONS = [
  { min: 5, label: '5m' }, { min: 10, label: '10m' }, { min: 15, label: '15m' }, { min: 20, label: '20m' },
  { min: 30, label: '30m' }, { min: 45, label: '45m' }, { min: 60, label: '1h' }, { min: 75, label: '1h15m' },
  { min: 90, label: '1h30m' }, { min: 105, label: '1h45m' }, { min: 120, label: '2h' }, { min: 150, label: '2h30m' },
  { min: 180, label: '3h' }, { min: 240, label: '4h' }, { min: 300, label: '5h' }, { min: 360, label: '6h' },
  { min: 480, label: '8h' },
]
const MAX_DURATION = 23 * 60 + 59 // a task stays within one day

function initialForm(task, defaults) {
  if (task) {
    const start = toMinutes(task.start_time)
    const end = toMinutes(task.end_time)
    return {
      title: task.title || '',
      description: task.description || '',
      when: task.start_time ? 'timeline' : 'inbox',
      date: task.due_date || '',
      start: task.start_time || '09:00',
      duration: start !== null && end !== null && end > start ? end - start : 30,
      color: task.color || DEFAULT_TASK_COLOR,
      icon: task.icon || 'star',
      categoryId: task.category_id || null,
      priority: task.priority || 'medium',
      recurrence: task.recurrence || 'none',
    }
  }
  return {
    title: '',
    description: '',
    when: 'timeline',
    date: defaults.date || '',
    start: defaults.start || '09:00',
    duration: defaults.duration || 30,
    color: DEFAULT_TASK_COLOR,
    icon: 'star',
    categoryId: null,
    priority: 'medium',
    recurrence: 'none',
  }
}

export default function NewTaskModal({
  task, defaults = {}, categories, tags, onCreateTag, onSave, onDelete, onClose,
}) {
  const isEdit = !!task
  const [form, setForm] = useState(() => initialForm(task, defaults))
  const [startForm] = useState(form)             // snapshot to detect unsaved changes
  const [showMore, setShowMore] = useState(isEdit)
  const [error, setError] = useState('')
  const [customText, setCustomText] = useState(String(form.duration)) // lets the box be emptied while typing
  const [saving, setSaving] = useState(false)
  const [tagIds, setTagIds] = useState([])
  const [subtasks, setSubtasks] = useState([])   // saved: real ids. new task: "tmp-N" ids
  const tmpId = useRef(0)
  const titleRef = useRef(null)

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const dirty = JSON.stringify(form) !== JSON.stringify(startForm)
    || (!isEdit && (tagIds.length > 0 || subtasks.length > 0))

  // Load tags + subtasks of an existing task
  useEffect(() => {
    if (!task) return
    apiFetch(`/tags/tasks/${task.id}`).then(r => r.json()).then(t => setTagIds(t.map(x => x.id))).catch(() => {})
    apiFetch(`/tasks/${task.id}/subtasks`).then(r => r.json()).then(setSubtasks).catch(() => {})
  }, [task])

  useEffect(() => { if (!isEdit) titleRef.current?.focus() }, [isEdit])

  function requestClose() {
    if (dirty && !window.confirm('Discard your changes?')) return
    onClose()
  }

  // Esc closes, and page behind does not scroll while the modal is open
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  })

  // --- Tags ---
  async function attachTag(tagId) {
    if (isEdit) await apiFetch(`/tags/tasks/${task.id}/tags/${tagId}`, { method: 'POST' })
    setTagIds(prev => (prev.includes(tagId) ? prev : [...prev, tagId]))
  }
  async function detachTag(tagId) {
    if (isEdit) await apiFetch(`/tags/tasks/${task.id}/tags/${tagId}`, { method: 'DELETE' })
    setTagIds(prev => prev.filter(id => id !== tagId))
  }

  // --- Subtasks ---
  async function addSubtask(title) {
    if (isEdit) {
      const res = await apiFetch(`/tasks/${task.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) })
      if (res.ok) {
        const created = await res.json()
        setSubtasks(prev => [...prev, created])
      }
    } else {
      tmpId.current += 1
      setSubtasks(prev => [...prev, { id: `tmp-${tmpId.current}`, title, completed: false }])
    }
  }
  async function toggleSubtask(sub) {
    const completed = !sub.completed
    if (isEdit) {
      await apiFetch(`/subtasks/${sub.id}`, { method: 'PUT', body: JSON.stringify({ completed }) })
    }
    setSubtasks(prev => prev.map(s => (s.id === sub.id ? { ...s, completed } : s)))
  }
  async function deleteSubtask(sub) {
    if (isEdit) await apiFetch(`/subtasks/${sub.id}`, { method: 'DELETE' })
    setSubtasks(prev => prev.filter(s => s.id !== sub.id))
  }

  // --- Save ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Give your task a title.'); titleRef.current?.focus(); return }
    if (form.when === 'timeline' && !form.date) { setError('Pick a date, or switch to Inbox.'); return }
    if (form.when === 'timeline' && !form.start) { setError('Pick a start time.'); return }

    const timed = form.when === 'timeline'
    const payload = {
      title: form.title.trim(),
      description: form.description,
      due_date: form.date || null,
      start_time: timed ? form.start : null,
      end_time: timed ? fromMinutes(toMinutes(form.start) + form.duration) : null,
      priority: form.priority,
      category_id: form.categoryId,
      recurrence: form.recurrence,
      color: form.color,
      icon: form.icon,
    }

    setSaving(true)
    setError('')
    try {
      const saved = await onSave(payload, task)
      if (!isEdit) {
        // Now the task has a real id: attach the tags and create the subtasks
        for (const tagId of tagIds) {
          await apiFetch(`/tags/tasks/${saved.id}/tags/${tagId}`, { method: 'POST' })
        }
        for (const sub of subtasks) {
          const res = await apiFetch(`/tasks/${saved.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title: sub.title }) })
          if (res.ok && sub.completed) {
            const created = await res.json()
            await apiFetch(`/subtasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ completed: true }) })
          }
        }
      }
      onClose()
    } catch {
      setError('Could not save the task. Please try again.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    await onDelete(task.id)
    onClose()
  }

  const summary = form.when === 'timeline' && form.start
    ? `${form.start}-${fromMinutes(toMinutes(form.start) + form.duration)} · ${formatDuration(form.duration)}`
    : 'No time yet'

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) requestClose() }}>
      <form className="modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'New task'}>
        <header className="modal-header">
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
            <Icon name="x" size={20} strokeWidth={3} />
          </button>
          <h2 className="modal-title">{isEdit ? 'EDIT TASK' : 'NEW TASK'}</h2>
          <span className="modal-header-spacer" />
        </header>

        <div className="modal-body">
          {/* Icon preview + title + live time summary */}
          <div className="title-row">
            <span className="preview-circle" style={{ '--task-color': form.color }}>
              <Icon name={form.icon} size={26} strokeWidth={2.4} />
            </span>
            <div className="title-fields">
              <input
                ref={titleRef}
                type="text"
                className="title-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="What's the plan?"
                aria-label="Task title"
              />
              <span className="summary-pill">{summary}</span>
            </div>
          </div>

          <div className="section-label">WHEN</div>
          <div className="segmented" role="group" aria-label="When">
            {[['timeline', 'TIMELINE'], ['inbox', 'INBOX']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`segment ${form.when === value ? 'active' : ''}`}
                onClick={() => set('when', value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="field-pair">
            <label className="field-box">
              <span className="field-label">DATE{form.when === 'inbox' ? ' (OPTIONAL)' : ''}</span>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              <Icon name="calendar" size={18} className="field-icon" />
            </label>
            {form.when === 'timeline' && (
              <label className="field-box">
                <span className="field-label">START</span>
                <input type="time" value={form.start} onChange={e => set('start', e.target.value)} />
                <Icon name="clock" size={18} className="field-icon" />
              </label>
            )}
          </div>

          {form.when === 'timeline' && (
            <>
              <div className="section-label">DURATION</div>
              <div className="chip-row">
                {DURATIONS.map(d => (
                  <button
                    key={d.min}
                    type="button"
                    className={`chip ${form.duration === d.min ? 'active' : ''}`}
                    onClick={() => { set('duration', d.min); setCustomText(String(d.min)) }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <label className="custom-duration">
                <span className="field-label">CUSTOM (MINUTES)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={MAX_DURATION}
                  value={customText}
                  onChange={e => {
                    setCustomText(e.target.value)
                    const minutes = Math.round(Number(e.target.value))
                    if (minutes >= 1) set('duration', Math.min(minutes, MAX_DURATION))
                  }}
                  onBlur={() => setCustomText(String(form.duration))}
                  aria-label="Custom duration in minutes"
                />
              </label>
            </>
          )}

          <div className="section-label">COLOUR</div>
          <div className="color-row">
            {TASK_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                className={`color-dot ${form.color === c.value ? 'active' : ''}`}
                style={{ background: c.value }}
                onClick={() => set('color', c.value)}
                aria-label={c.name}
                aria-pressed={form.color === c.value}
              />
            ))}
          </div>

          <div className="section-label">ICON</div>
          <div className="icon-grid">
            {TASK_ICONS.map(name => (
              <button
                key={name}
                type="button"
                className={`icon-cell ${form.icon === name ? 'active' : ''}`}
                onClick={() => set('icon', name)}
                aria-label={name}
                aria-pressed={form.icon === name}
              >
                <Icon name={name} size={22} />
              </button>
            ))}
          </div>

          <button type="button" className="more-toggle" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>
            MORE OPTIONS
            <Icon name="chevron-down" size={18} strokeWidth={3} className={showMore ? 'flip' : ''} />
          </button>

          {showMore && (
            <div className="more-section">
              <div className="section-label">DESCRIPTION</div>
              <textarea
                className="field-input"
                rows={3}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Add details..."
              />

              <div className="section-label">LIST</div>
              <CategoryPicker categories={categories} value={form.categoryId} onChange={v => set('categoryId', v)} />

              <div className="section-label">PRIORITY</div>
              <div className="chip-row">
                {['high', 'medium', 'low'].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`chip ${form.priority === p ? 'active' : ''}`}
                    onClick={() => set('priority', p)}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="section-label">REPEAT</div>
              <select className="field-input" value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>

              <div className="section-label">TAGS</div>
              <TagPicker
                tags={tags}
                selectedTagIds={tagIds}
                onAttach={attachTag}
                onDetach={detachTag}
                onCreate={onCreateTag}
              />

              <div className="section-label">SUBTASKS</div>
              <SubtaskList subtasks={subtasks} onAdd={addSubtask} onToggle={toggleSubtask} onDelete={deleteSubtask} />
            </div>
          )}
        </div>

        <footer className="modal-footer">
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Icon name="trash" size={18} /> DELETE
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-grow" disabled={saving}>
              {saving ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'CREATE TASK'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
