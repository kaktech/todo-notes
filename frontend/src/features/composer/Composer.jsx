/**
 * Composer: add or edit a task. One line to type, then refine with tabs.
 * While adding, the line understands "gym tomorrow 6pm for an hour" (see quickAdd.js).
 * Tabs: When · Look · Details · Tags · Steps.
 *
 * Title and description are separate state on purpose (past bug: they got merged).
 * Tags and steps for a NEW task are held locally and sent only after the task
 * exists and has a real id (past bug: attaching tags with no id).
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import Icon, { GLYPHS } from '../../shared/Icon'
import { TASK_COLORS, DEFAULT_TASK_COLOR } from '../../theme/colors'
import { toMinutes, fromMinutes, formatDuration, shortDate, todayStr } from '../../shared/dates'
import { apiFetch } from '../../shared/api'
import { parseQuickAdd } from '../tasks/quickAdd'
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

const TABS = [
  { id: 'when', label: 'When', icon: 'clock' },
  { id: 'look', label: 'Look', icon: 'sparkle' },
  { id: 'details', label: 'Details', icon: 'note' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'steps', label: 'Steps', icon: 'list' },
]

function initialForm(task, defaults) {
  if (task) {
    const start = toMinutes(task.start_time)
    const end = toMinutes(task.end_time)
    return {
      title: task.title || '',
      description: task.description || '',
      timed: !!task.start_time,
      date: task.due_date || '',
      start: task.start_time || '09:00',
      duration: start !== null && end !== null && end > start ? end - start : 30,
      color: task.color || DEFAULT_TASK_COLOR,
      icon: task.icon || 'target',
      categoryId: task.category_id || null,
      priority: task.priority || 'medium',
      recurrence: task.recurrence || 'none',
    }
  }
  return {
    title: defaults.title || '',
    description: '',
    timed: defaults.timed ?? false,
    date: defaults.date || todayStr(), // clear the day in the Anytime tab to leave a task undated
    start: defaults.start || '09:00',
    duration: defaults.duration || 30,
    color: DEFAULT_TASK_COLOR,
    icon: 'target',
    categoryId: null,
    priority: 'medium',
    recurrence: 'none',
  }
}

export default function Composer({
  task, defaults = {}, categories, tags, onCreateTag, onSave, onDelete, onClose,
}) {
  const isEdit = !!task
  const [form, setForm] = useState(() => initialForm(task, defaults))
  const [startForm] = useState(form)              // snapshot to detect unsaved changes
  // Fields the person set by hand; the quick-add line never overrides these
  const [touched, setTouched] = useState({})
  const [tab, setTab] = useState('when')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customText, setCustomText] = useState(String(form.duration)) // lets the box be emptied while typing
  const [tagIds, setTagIds] = useState([])
  const [steps, setSteps] = useState([])          // saved: real ids. new task: "tmp-N" ids
  const tmpId = useRef(0)
  const lineRef = useRef(null)

  // What the line of text means. Editing an existing task never re-parses its title.
  const parsed = useMemo(() => (isEdit ? null : parseQuickAdd(form.title)), [isEdit, form.title])

  const eff = {
    title: parsed ? parsed.title : form.title,
    date: touched.date || !parsed?.date ? form.date : parsed.date,
    timed: touched.timed || !parsed?.start ? form.timed : true,
    start: touched.start || !parsed?.start ? form.start : parsed.start,
    duration: touched.duration || !parsed?.duration ? form.duration : parsed.duration,
  }

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const setByHand = (field, value) => { set(field, value); setTouched(prev => ({ ...prev, [field]: true })) }

  const dirty = JSON.stringify(form) !== JSON.stringify(startForm) || (!isEdit && (tagIds.length > 0 || steps.length > 0))

  // Load tags + steps of an existing task
  useEffect(() => {
    if (!task) return
    apiFetch(`/tags/tasks/${task.id}`).then(r => r.json()).then(t => setTagIds(t.map(x => x.id))).catch(() => {})
    apiFetch(`/tasks/${task.id}/subtasks`).then(r => r.json()).then(setSteps).catch(() => {})
  }, [task])

  useEffect(() => { if (!isEdit) lineRef.current?.focus() }, [isEdit])

  function requestClose() {
    if (dirty && !window.confirm('Discard your changes?')) return
    onClose()
  }

  // Esc closes, and the page behind does not scroll while the composer is open
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

  // --- Steps (subtasks) ---
  async function addStep(title) {
    if (isEdit) {
      const res = await apiFetch(`/tasks/${task.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) })
      if (res.ok) {
        const created = await res.json()
        setSteps(prev => [...prev, created])
      }
    } else {
      tmpId.current += 1
      setSteps(prev => [...prev, { id: `tmp-${tmpId.current}`, title, completed: false }])
    }
  }
  async function toggleStep(step) {
    const completed = !step.completed
    if (isEdit) await apiFetch(`/subtasks/${step.id}`, { method: 'PUT', body: JSON.stringify({ completed }) })
    setSteps(prev => prev.map(s => (s.id === step.id ? { ...s, completed } : s)))
  }
  async function deleteStep(step) {
    if (isEdit) await apiFetch(`/subtasks/${step.id}`, { method: 'DELETE' })
    setSteps(prev => prev.filter(s => s.id !== step.id))
  }

  // --- Save ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!eff.title.trim()) { setError('Type what needs doing first.'); lineRef.current?.focus(); return }
    if (eff.timed && !eff.date) { setError('Pick a day, or switch to Anytime.'); setTab('when'); return }

    const payload = {
      title: eff.title.trim(),
      description: form.description,
      due_date: eff.date || null,
      start_time: eff.timed ? eff.start : null,
      end_time: eff.timed ? fromMinutes(toMinutes(eff.start) + eff.duration) : null,
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
        // The task now has a real id: attach the tags and create the steps
        for (const tagId of tagIds) {
          await apiFetch(`/tags/tasks/${saved.id}/tags/${tagId}`, { method: 'POST' })
        }
        for (const step of steps) {
          const res = await apiFetch(`/tasks/${saved.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title: step.title }) })
          if (res.ok && step.completed) {
            const created = await res.json()
            await apiFetch(`/subtasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ completed: true }) })
          }
        }
      }
      onClose()
    } catch {
      setError('Couldn\'t save that. Try again.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    await onDelete(task.id)
    onClose()
  }

  const endTime = fromMinutes(toMinutes(eff.start) + eff.duration)

  return (
    <div className="sheet-overlay" onMouseDown={e => { if (e.target === e.currentTarget) requestClose() }}>
      <form className="composer" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'Add a task'}>
        <span className="composer-handle" aria-hidden="true" />
        <div className="composer-head">
          <span className="glyph glyph-lg" style={{ '--tint': form.color }}>
            <Icon name={form.icon} size={26} strokeWidth={2.2} />
          </span>
          <div className="composer-line-wrap">
            <input
              ref={lineRef}
              type="text"
              className="composer-line"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={isEdit ? 'Task name' : 'gym tomorrow 6pm for an hour'}
              aria-label="Task"
            />
            <div className="parsed">
              <span className="tag tag-solid"><Icon name="calendar" size={12} strokeWidth={2.6} /> {eff.date ? shortDate(eff.date) : 'No day'}</span>
              <span className="tag tag-solid">
                <Icon name="clock" size={12} strokeWidth={2.6} /> {eff.timed ? `${eff.start}–${endTime} · ${formatDuration(eff.duration)}` : 'Anytime'}
              </span>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
            <Icon name="x" size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="composer-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`ctab ${tab === t.id ? 'on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={15} /> {t.label}
              {t.id === 'tags' && tagIds.length > 0 && <span className="ctab-n">{tagIds.length}</span>}
              {t.id === 'steps' && steps.length > 0 && <span className="ctab-n">{steps.length}</span>}
            </button>
          ))}
        </div>

        <div className="composer-body">
          {tab === 'when' && (
            <div>
              <div className="seg" role="group" aria-label="Timed or anytime">
                <button type="button" className={`seg-btn ${eff.timed ? 'on' : ''}`} onClick={() => setByHand('timed', true)}>At a time</button>
                <button type="button" className={`seg-btn ${!eff.timed ? 'on' : ''}`} onClick={() => setByHand('timed', false)}>Anytime</button>
              </div>

              <div className="pair">
                <label className="box">
                  <span className="box-label">Day{eff.timed ? '' : ' (optional)'}</span>
                  <input type="date" value={eff.date} onChange={e => setByHand('date', e.target.value)} />
                  <Icon name="calendar" size={18} className="box-icon" />
                </label>
                {eff.timed && (
                  <label className="box">
                    <span className="box-label">Starts</span>
                    <input type="time" value={eff.start} onChange={e => setByHand('start', e.target.value)} />
                    <Icon name="clock" size={18} className="box-icon" />
                  </label>
                )}
              </div>

              {eff.timed && (
                <>
                  <p className="mini-label">How long</p>
                  <div className="chips">
                    {DURATIONS.map(d => (
                      <button
                        key={d.min}
                        type="button"
                        className={`chip ${eff.duration === d.min ? 'on' : ''}`}
                        onClick={() => { setByHand('duration', d.min); setCustomText(String(d.min)) }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <label className="custom">
                    <span className="box-label">Custom minutes</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_DURATION}
                      value={touched.duration || !parsed?.duration ? customText : String(eff.duration)}
                      onChange={e => {
                        setCustomText(e.target.value)
                        const minutes = Math.round(Number(e.target.value))
                        if (minutes >= 1) setByHand('duration', Math.min(minutes, MAX_DURATION))
                      }}
                      onBlur={() => setCustomText(String(eff.duration))}
                      aria-label="Custom duration in minutes"
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {tab === 'look' && (
            <div>
              <p className="mini-label">Tint</p>
              <div className="tints">
                {TASK_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`tint ${form.color === c.value ? 'on' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => set('color', c.value)}
                    aria-label={c.name}
                    aria-pressed={form.color === c.value}
                  />
                ))}
              </div>
              <p className="mini-label">Glyph</p>
              <div className="glyph-grid">
                {GLYPHS.map(name => (
                  <button
                    key={name}
                    type="button"
                    className={`glyph-cell ${form.icon === name ? 'on' : ''}`}
                    onClick={() => set('icon', name)}
                    aria-label={name}
                    aria-pressed={form.icon === name}
                  >
                    <Icon name={name} size={22} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div>
              <p className="mini-label">Notes</p>
              <textarea
                className="field"
                rows={3}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Anything worth remembering"
              />
              <p className="mini-label">List</p>
              <CategoryPicker categories={categories} value={form.categoryId} onChange={v => set('categoryId', v)} />
              <p className="mini-label">Priority</p>
              <div className="chips">
                {['high', 'medium', 'low'].map(p => (
                  <button key={p} type="button" className={`chip ${form.priority === p ? 'on' : ''}`} onClick={() => set('priority', p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mini-label">Repeat</p>
              <select className="field" value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
                <option value="none">Doesn't repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
          )}

          {tab === 'tags' && (
            <TagPicker tags={tags} selectedTagIds={tagIds} onAttach={attachTag} onDetach={detachTag} onCreate={onCreateTag} />
          )}

          {tab === 'steps' && (
            <SubtaskList subtasks={steps} onAdd={addStep} onToggle={toggleStep} onDelete={deleteStep} />
          )}
        </div>

        <footer className="composer-foot">
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="composer-actions">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Icon name="trash" size={18} /> Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-grow" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
