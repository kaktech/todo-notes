/**
 * WeekBoard: seven day columns, Monday to Sunday. Drag a card to another day to
 * reschedule it (its time is kept). Tap a card to edit, tap the circle to tick it off.
 */
import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core'
import Icon from '../../shared/Icon'
import { DAYS_SHORT, MONTHS, addDays, fromDateStr, startOfWeek, todayStr, toMinutes, shortDate } from '../../shared/dates'
import { DEFAULT_TASK_COLOR } from '../../theme/colors'

function Card({ task, onToggle, onEdit, overlay }) {
  return (
    <div className={`wcard ${task.completed ? 'is-done' : ''} ${overlay ? 'is-overlay' : ''}`} style={{ '--tint': task.color || DEFAULT_TASK_COLOR }}>
      <button className="wtick" onClick={() => onToggle?.(task)} aria-pressed={task.completed} aria-label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}>
        {task.completed && <Icon name="check" size={12} strokeWidth={4} />}
      </button>
      <button className="wtext" onClick={() => onEdit?.(task)} aria-label={`Edit ${task.title}`}>
        <span className="wtime">{task.start_time || 'Anytime'}</span>
        <span className="wtitle">{task.title}</span>
      </button>
    </div>
  )
}

function DraggableCard({ task, onToggle, onEdit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`wdrag ${isDragging ? 'dragging' : ''}`}>
      <Card task={task} onToggle={onToggle} onEdit={onEdit} />
    </div>
  )
}

function DayColumn({ date, tasks, isToday, onToggle, onEdit, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: date })
  const d = fromDateStr(date)
  return (
    <section ref={setNodeRef} className={`wcol ${isToday ? 'is-today' : ''} ${isOver ? 'is-over' : ''}`} aria-label={shortDate(date)}>
      <header className="wcol-head">
        <span className="wcol-dow">{DAYS_SHORT[d.getDay()]}</span>
        <span className="wcol-num">{d.getDate()}</span>
        <button className="icon-btn icon-btn-small" onClick={() => onAdd(date)} aria-label={`Add a task on ${shortDate(date)}`}>
          <Icon name="plus" size={14} strokeWidth={3} />
        </button>
      </header>
      <div className="wcol-cards">
        {tasks.length === 0 && <p className="wcol-empty">Open air</p>}
        {tasks.map(t => <DraggableCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />)}
      </div>
    </section>
  )
}

export default function WeekBoard({ tasks, onToggle, onUpdate, onEdit, onCompose }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayStr()))
  const [dragging, setDragging] = useState(null)
  const [error, setError] = useState('')
  const today = todayStr()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const byDay = date => tasks
    .filter(t => t.due_date === date)
    .sort((a, b) => (toMinutes(a.start_time) ?? 9999) - (toMinutes(b.start_time) ?? 9999) || a.position - b.position)

  const first = fromDateStr(days[0])
  const last = fromDateStr(days[6])
  const label = first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ${MONTHS[first.getMonth()]}`
    : `${first.getDate()} ${MONTHS[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTHS[last.getMonth()].slice(0, 3)}`

  async function handleDragEnd({ active, over }) {
    setDragging(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task || task.due_date === over.id) return
    try {
      setError('')
      await onUpdate(task.id, { due_date: over.id })
    } catch {
      setError('Couldn\'t move that task.')
    }
  }

  return (
    <div className="view week">
      <header className="week-head">
        <div>
          <p className="eyebrow">Week board</p>
          <h1 className="hero-title">{label}</h1>
        </div>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><Icon name="chevron-left" size={18} strokeWidth={3} /></button>
          <button className="btn" onClick={() => setWeekStart(startOfWeek(today))}>This week</button>
          <label className="icon-btn jump" aria-label="Jump to a date" title="Jump to a date">
            <Icon name="calendar" size={18} />
            <input type="date" value={weekStart} onChange={e => e.target.value && setWeekStart(startOfWeek(e.target.value))} />
          </label>
          <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><Icon name="chevron-right" size={18} strokeWidth={3} /></button>
        </div>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      <p className="soft week-tip">Drag a card to another day to reschedule it.</p>

      <DndContext
        sensors={sensors}
        onDragStart={e => setDragging(tasks.find(t => t.id === e.active.id) || null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="board">
          {days.map(date => (
            <DayColumn
              key={date}
              date={date}
              tasks={byDay(date)}
              isToday={date === today}
              onToggle={onToggle}
              onEdit={onEdit}
              onAdd={d => onCompose({ date: d })}
            />
          ))}
        </div>
        <DragOverlay>{dragging ? <Card task={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
