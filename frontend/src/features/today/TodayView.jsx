/**
 * TodayView: greeting, a search-or-add line, the Now card, the Slipped tray (overdue),
 * Up next (timed tiles), Anytime (drag to reorder) and Done today.
 */
import { useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import Icon from '../../shared/Icon'
import EmptyState from '../../shared/EmptyState'
import { DAYS_LONG, DAYS_SHORT, MONTHS, addDays, fromDateStr, greetingFor, minutesOfDay, startOfWeek, todayStr, toMinutes, fromMinutes, formatDuration, shortDate } from '../../shared/dates'
import { parseQuickAdd } from '../tasks/quickAdd'
import { StaticTile, SortableTile } from '../tasks/PaneTile'
import { DEFAULT_TASK_COLOR } from '../../theme/colors'

function daysLate(dueDate) {
  return Math.round((fromDateStr(todayStr()) - fromDateStr(dueDate)) / 86400000)
}

/* ---------- Now card ---------- */

function NowCard({ current, next, now, onDone, onExtend, onEdit, onCompose }) {
  if (current) {
    const start = toMinutes(current.start_time)
    const end = toMinutes(current.end_time) ?? start + 30
    const nowMin = minutesOfDay(now)
    const left = Math.max(end - nowMin, 0)
    const progress = Math.min(Math.max((nowMin - start) / Math.max(end - start, 1), 0), 1)
    const R = 30
    const C = 2 * Math.PI * R
    return (
      <section className="now" style={{ '--tint': current.color || DEFAULT_TASK_COLOR }} aria-label="Happening now">
        <div className="ring" role="img" aria-label={`${formatDuration(left)} left`}>
          <svg viewBox="0 0 72 72" width="72" height="72">
            <circle cx="36" cy="36" r={R} className="ring-track" />
            <circle cx="36" cy="36" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <span className="ring-text">{formatDuration(left)}<small>left</small></span>
        </div>
        <div className="now-main">
          <p className="eyebrow">Now · {current.start_time} to {current.end_time || fromMinutes(end)}</p>
          <button className="now-title" onClick={() => onEdit(current)}>{current.title}</button>
        </div>
        <div className="now-actions">
          <button className="btn btn-primary" onClick={() => onDone(current)}><Icon name="check" size={16} strokeWidth={3.5} /> Done</button>
          <button className="btn" onClick={() => onExtend(current, 15)}><Icon name="plus" size={16} strokeWidth={3} /> 15 min</button>
        </div>
      </section>
    )
  }
  if (next) {
    const minutesAway = toMinutes(next.start_time) - minutesOfDay(now)
    return (
      <section className="now now-quiet" style={{ '--tint': next.color || DEFAULT_TASK_COLOR }} aria-label="Next up">
        <span className="glyph glyph-lg"><Icon name={next.icon || 'target'} size={26} strokeWidth={2.2} /></span>
        <div className="now-main">
          <p className="eyebrow">{minutesAway > 0 ? `Free for ${formatDuration(minutesAway)}` : 'Starting now'} · next at {next.start_time}</p>
          <button className="now-title" onClick={() => onEdit(next)}>{next.title}</button>
        </div>
        <div className="now-actions">
          <button className="btn" onClick={() => onCompose({ date: todayStr(), timed: true, start: fromMinutes(Math.min(Math.ceil((minutesOfDay(now) + 1) / 5) * 5, 23 * 60 + 55)), duration: Math.min(Math.max(minutesAway, 15), 60) })}>
            <Icon name="plus" size={16} strokeWidth={3} /> Fill the gap
          </button>
        </div>
      </section>
    )
  }
  return null
}

/* ---------- Slipped tray ---------- */

function SlippedTray({ tasks, onMove, onEdit, onDelete }) {
  const [openId, setOpenId] = useState(null)
  const open = tasks.find(t => t.id === openId)
  if (tasks.length === 0) return null
  return (
    <section className="slipped slipped-inline" aria-label="Slipped tasks">
      <p className="eyebrow">Slipped · {tasks.length} <span className="soft">tap one to reschedule</span></p>
      <div className="slipped-chips">
        {tasks.map(t => (
          <button key={t.id} className={`slip-chip ${openId === t.id ? 'on' : ''}`} onClick={() => setOpenId(openId === t.id ? null : t.id)} aria-expanded={openId === t.id}>
            <Icon name="undo" size={14} strokeWidth={2.6} /> {t.title} <span className="slip-age">{daysLate(t.due_date)}d</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="slip-panel">
          <div>
            <strong>{open.title}</strong>
            <p className="soft">Was due {shortDate(open.due_date)}</p>
          </div>
          <div className="slip-actions">
            <button className="btn btn-primary btn-small" onClick={() => { onMove(open, todayStr()); setOpenId(null) }}>Today</button>
            <button className="btn btn-small" onClick={() => { onMove(open, addDays(todayStr(), 1)); setOpenId(null) }}>Tomorrow</button>
            <button className="btn btn-small" onClick={() => { onEdit(open); setOpenId(null) }}>Edit</button>
            <button className="btn btn-small btn-danger" onClick={() => { onDelete(open); setOpenId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------- Side rail (laptops): quick add, progress, slipped, week glance ---------- */

function QuickAdd({ onCreate }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parsed = text.trim() ? parseQuickAdd(text) : null

  async function submit(e) {
    e.preventDefault()
    if (!parsed || busy) return
    const timed = !!parsed.start
    const duration = parsed.duration || 30
    setBusy(true)
    setError('')
    try {
      await onCreate({
        title: parsed.title,
        description: '',
        due_date: parsed.date || todayStr(),
        start_time: timed ? parsed.start : null,
        end_time: timed ? fromMinutes(toMinutes(parsed.start) + duration) : null,
        priority: 'medium',
        category_id: null,
        recurrence: 'none',
        color: DEFAULT_TASK_COLOR,
        icon: 'target',
      })
      setText('')
    } catch {
      setError('Couldn\'t add that. Try again.')
    }
    setBusy(false)
  }

  return (
    <form className="rail-card" onSubmit={submit}>
      <p className="eyebrow">Quick add</p>
      <input
        className="field rail-input"
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="gym tomorrow 6pm for an hour"
        aria-label="Quick add a task"
      />
      <div className="rail-parsed">
        {parsed ? (
          <>
            <span className="tag tag-solid"><Icon name="calendar" size={12} strokeWidth={2.6} /> {parsed.date ? shortDate(parsed.date) : 'Today'}</span>
            <span className="tag tag-solid"><Icon name="clock" size={12} strokeWidth={2.6} /> {parsed.start ? `${parsed.start} · ${formatDuration(parsed.duration || 30)}` : 'Anytime'}</span>
          </>
        ) : (
          <span className="soft">Type it the way you'd say it, then press Enter.</span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-small" type="submit" disabled={!parsed || busy}>{busy ? 'Adding…' : 'Add'}</button>
    </form>
  )
}

function Rail({ tasks, slipped, todayTasks, now, onMove, onEdit, onDelete, onCreate, onOpenWeek }) {
  const today = todayStr()
  const total = todayTasks.length
  const done = todayTasks.filter(t => t.completed).length
  const weekStart = startOfWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const counts = days.map(d => tasks.filter(t => t.due_date === d && !t.completed).length)
  const peak = Math.max(...counts, 1)

  return (
    <aside className="rail" aria-label="Side panel">
      <QuickAdd onCreate={onCreate} />

      <section className="rail-card">
        <p className="eyebrow">Today so far</p>
        <p className="rail-big">{done}<span> of {total} done</span></p>
        <div className="bar" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
          <span style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
        </div>
      </section>

      <section className="rail-card">
        <p className="eyebrow">Slipped · {slipped.length}</p>
        {slipped.length === 0 && <p className="soft">Nothing slipped. Nice.</p>}
        {slipped.map(t => (
          <div className="rail-slip" key={t.id}>
            <button className="rail-slip-title" onClick={() => onEdit(t)}>{t.title}</button>
            <span className="slip-age">{daysLate(t.due_date)}d late</span>
            <span className="rail-slip-actions">
              <button className="btn btn-small btn-primary" onClick={() => onMove(t, today)}>Today</button>
              <button className="btn btn-small" onClick={() => onMove(t, addDays(today, 1))}>Tomorrow</button>
              <button className="icon-btn icon-btn-small icon-btn-danger" onClick={() => onDelete(t)} aria-label={`Delete ${t.title}`}><Icon name="trash" size={14} /></button>
            </span>
          </div>
        ))}
      </section>

      <section className="rail-card">
        <p className="eyebrow">This week</p>
        <div className="glance">
          {days.map((d, i) => (
            <button key={d} className={`glance-row ${d === today ? 'is-today' : ''}`} onClick={onOpenWeek} aria-label={`${shortDate(d)}: ${counts[i]} open`}>
              <span className="glance-day">{DAYS_SHORT[fromDateStr(d).getDay()]}</span>
              <span className="glance-bar"><span style={{ width: `${(counts[i] / peak) * 100}%` }} /></span>
              <span className="glance-n">{counts[i]}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-small" onClick={onOpenWeek}>Open week board</button>
      </section>
    </aside>
  )
}

/* ---------- Page ---------- */

export default function TodayView({
  tasks, loading, error, categories, tags, taskTagMap, now,
  onToggle, onUpdate, onReorder, onDelete, onCompose, onEdit, onCreate, onOpenWeek, onLoadSample,
}) {
  const [query, setQuery] = useState('')
  const [reorderError, setReorderError] = useState('')
  const [sampling, setSampling] = useState(false)
  const today = todayStr()
  const nowMin = minutesOfDay(now)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const q = query.trim().toLowerCase()
  const visible = q ? tasks.filter(t => t.title.toLowerCase().includes(q)) : tasks

  const slipped = visible
    .filter(t => !t.completed && t.due_date && t.due_date < today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const timedToday = visible
    .filter(t => t.due_date === today && t.start_time && !t.completed)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || a.position - b.position)
  const anytime = visible
    .filter(t => !t.completed && (!t.due_date || (t.due_date === today && !t.start_time)))
    .sort((a, b) => a.position - b.position)
  const doneToday = visible.filter(t => t.completed && (t.due_date === today || !t.due_date))

  const endOf = t => toMinutes(t.end_time) ?? toMinutes(t.start_time) + 30
  const current = timedToday.find(t => toMinutes(t.start_time) <= nowMin && nowMin < endOf(t)) || null
  const next = timedToday.find(t => toMinutes(t.start_time) > nowMin) || null
  const upNext = timedToday.filter(t => t !== current)

  const catById = id => categories.find(c => c.id === id)
  const tagsFor = task => (taskTagMap[task.id] || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
  const confirmDelete = task => { if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id) }
  const tileProps = task => ({ task, category: catById(task.category_id), tags: tagsFor(task), onToggle, onEdit, onDelete: confirmDelete })

  async function extend(task, minutes) {
    const end = toMinutes(task.end_time) ?? toMinutes(task.start_time) + 30
    await onUpdate(task.id, { end_time: fromMinutes(end + minutes) })
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = anytime.findIndex(t => t.id === active.id)
    const to = anytime.findIndex(t => t.id === over.id)
    const items = arrayMove(anytime, from, to).map((t, i) => ({ id: t.id, position: i + 1 }))
    try {
      setReorderError('')
      await onReorder(items)
    } catch {
      setReorderError('Couldn\'t save the new order.')
    }
  }

  function submitLine(e) {
    e.preventDefault()
    if (!query.trim()) return
    onCompose({ title: query.trim() })
    setQuery('')
  }

  const d = now
  const eyebrow = `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase()
  const nothingAtAll = !loading && slipped.length === 0 && timedToday.length === 0 && anytime.length === 0 && doneToday.length === 0
  const allClear = !loading && !nothingAtAll && timedToday.length === 0 && anytime.length === 0 && slipped.length === 0

  const todayTasks = tasks.filter(t => t.due_date === today)

  return (
    <div className="view today">
     <div className="today-grid">
      <div className="today-main">
      <header className="hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="hero-title">{greetingFor(d.getHours())}</h1>
        <form className="find" onSubmit={submitLine}>
          <Icon name="search" size={18} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a task, or press Enter to add it"
            aria-label="Find or add a task"
          />
          {query && <span className="find-hint">Enter to add</span>}
        </form>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {reorderError && <div className="error-banner" role="alert">{reorderError}</div>}

      {loading ? (
        <p className="soft">Loading…</p>
      ) : (
        <>
          <NowCard current={current} next={next} now={now} onDone={onToggle} onExtend={extend} onEdit={onEdit} onCompose={onCompose} />

          <SlippedTray
            tasks={slipped}
            onMove={(task, date) => onUpdate(task.id, { due_date: date })}
            onEdit={onEdit}
            onDelete={confirmDelete}
          />

          {nothingAtAll && (
            q ? <p className="soft">Nothing matches “{query}”. Press Enter to add it as a task.</p> : (
              <EmptyState
                icon="cloud"
                title="Open air"
                text="Nothing planned today. Type a task above, or use the + in the dock."
                actionLabel="Plan something"
                onAction={() => onCompose({ date: today })}
                secondaryLabel={tasks.length === 0 ? 'Load sample data' : undefined}
                secondaryBusy={sampling}
                onSecondary={async () => {
                  setSampling(true)
                  try { await onLoadSample() } catch { setReorderError('Couldn\'t load the sample data. Try again.') }
                  setSampling(false)
                }}
              />
            )
          )}

          {allClear && (
            <EmptyState icon="check" title="All clear" text="Everything for today is done. Nice." actionLabel="Add another" onAction={() => onCompose({ date: today })} />
          )}

          {upNext.length > 0 && (
            <section>
              <p className="eyebrow section">Up next · {upNext.length}</p>
              <div className="tiles">
                {upNext.map(task => (
                  <StaticTile key={task.id} {...tileProps(task)} late={toMinutes(task.end_time ?? task.start_time) < nowMin} />
                ))}
              </div>
            </section>
          )}

          {anytime.length > 0 && (
            <section>
              <p className="eyebrow section">Anytime · {anytime.length}</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={anytime.map(t => t.id)} strategy={rectSortingStrategy}>
                  <div className="tiles">
                    {anytime.map(task => <SortableTile key={task.id} {...tileProps(task)} />)}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {doneToday.length > 0 && (
            <details className="done-block">
              <summary className="eyebrow section">Done · {doneToday.length}</summary>
              <div className="tiles">
                {doneToday.map(task => <StaticTile key={task.id} {...tileProps(task)} />)}
              </div>
            </details>
          )}
        </>
      )}
      </div>

      <Rail
        tasks={tasks}
        slipped={slipped}
        todayTasks={todayTasks}
        now={now}
        onMove={(task, date) => onUpdate(task.id, { due_date: date })}
        onEdit={onEdit}
        onDelete={confirmDelete}
        onCreate={onCreate}
        onOpenWeek={onOpenWeek}
      />
     </div>
    </div>
  )
}
