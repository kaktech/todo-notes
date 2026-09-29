/**
 * TasksPage (Timeline): date strip, day heading, overdue tasks, and the day's tasks.
 * Timed tasks are ordered by start time with "free" gaps between them.
 * Untimed tasks (no time yet, or no date) sit in a "No time yet" list you can drag to reorder.
 * Overdue = not done and due before today (shown on every day, except on its own day).
 */
import { useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Icon from '../../shared/Icon'
import EmptyState from '../../shared/EmptyState'
import MiniCalendar from '../../shared/MiniCalendar'
import DateStrip from './DateStrip'
import { StaticTaskCard, SortableTaskCard } from './TaskCard'
import { DAYS_LONG, MONTHS, fromDateStr, todayStr, toMinutes, fromMinutes, formatDuration, addDays } from '../../shared/dates'

const MIN_GAP = 15 // minutes; smaller gaps are not worth showing

export default function TasksPage({
  tasks, loading, error, categories, tags, taskTagMap, selectedDate, onSelectDate,
  onToggle, onReorder, onDelete, onMoveToToday, onNewTask, onEditTask,
}) {
  const [reorderError, setReorderError] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [overdueOpen, setOverdueOpen] = useState(true)
  const today = todayStr()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const overdue = tasks
    .filter(t => !t.completed && t.due_date && t.due_date < today && t.due_date !== selectedDate)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || (a.start_time || '').localeCompare(b.start_time || ''))
  const timed = tasks
    .filter(t => t.due_date === selectedDate && t.start_time)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || a.position - b.position)
  const untimed = tasks
    .filter(t => !t.due_date || (t.due_date === selectedDate && !t.start_time))
    .sort((a, b) => a.position - b.position)

  const catById = id => categories.find(c => c.id === id)
  const tagsFor = task => (taskTagMap[task.id] || []).map(id => tags.find(t => t.id === id)).filter(Boolean)

  function confirmDelete(task) {
    if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id)
  }

  const cardProps = task => ({
    task,
    category: catById(task.category_id),
    tags: tagsFor(task),
    onToggle,
    onOpen: onEditTask,
    onDelete: confirmDelete,
  })

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = untimed.findIndex(t => t.id === active.id)
    const to = untimed.findIndex(t => t.id === over.id)
    const items = arrayMove(untimed, from, to).map((t, i) => ({ id: t.id, position: i + 1 }))
    try {
      setReorderError('')
      await onReorder(items)
    } catch {
      setReorderError('Could not save the new order.')
    }
  }

  // Cards for timed tasks, with a gap row wherever there is free time between two tasks
  const timedRows = []
  timed.forEach((task, i) => {
    const prev = timed[i - 1]
    if (prev) {
      const prevEnd = toMinutes(prev.end_time) ?? toMinutes(prev.start_time)
      const gap = toMinutes(task.start_time) - prevEnd
      if (gap >= MIN_GAP) {
        timedRows.push(
          <div className="gap-row" key={`gap-${task.id}`}>
            <span className="gap-icon"><Icon name="clock" size={16} /></span>
            <span className="gap-text">{formatDuration(gap)} free</span>
            <button
              className="btn btn-small"
              onClick={() => onNewTask({ date: selectedDate, start: fromMinutes(prevEnd), duration: Math.min(gap, 30) })}
            >
              + PLAN
            </button>
          </div>
        )
      }
    }
    timedRows.push(<StaticTaskCard key={task.id} {...cardProps(task)} />)
  })

  const d = fromDateStr(selectedDate)
  let heading = DAYS_LONG[d.getDay()]
  if (selectedDate === today) heading = 'Today'
  else if (selectedDate === addDays(today, 1)) heading = 'Tomorrow'
  else if (selectedDate === addDays(today, -1)) heading = 'Yesterday'
  const subtitle = `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`

  const isEmpty = timed.length === 0 && untimed.length === 0

  return (
    <div className="page timeline-page">
      <DateStrip selectedDate={selectedDate} onSelect={onSelectDate} onOpenCalendar={() => setShowCalendar(true)} />

      <header className="day-heading">
        <h1 className="day-title">{heading}</h1>
        <p className="day-subtitle">{DAYS_LONG[d.getDay()].slice(0, 3).toUpperCase()}, {subtitle}</p>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {reorderError && <div className="error-banner" role="alert">{reorderError}</div>}

      {overdue.length > 0 && (
        <section className="overdue-section" aria-label="Overdue tasks">
          <button className="overdue-header" onClick={() => setOverdueOpen(!overdueOpen)} aria-expanded={overdueOpen}>
            <span className="overdue-icon"><Icon name="alert" size={18} strokeWidth={2.4} /></span>
            <span className="overdue-title">OVERDUE</span>
            <span className="count-badge count-badge-danger">{overdue.length}</span>
            <Icon name="chevron-down" size={18} strokeWidth={3} className={overdueOpen ? 'flip' : ''} />
          </button>
          {overdueOpen && (
            <div className="timeline-list">
              {overdue.map(task => (
                <StaticTaskCard key={task.id} {...cardProps(task)} overdue onMoveToToday={onMoveToToday} />
              ))}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <p className="muted-note">Loading tasks...</p>
      ) : isEmpty ? (
        <EmptyState
          title="Your day starts here"
          text="Add a task and it lands on this timeline — pick a time, a colour and an icon."
          actionLabel="ADD YOUR FIRST TASK"
          onAction={() => onNewTask({ date: selectedDate })}
        />
      ) : (
        <>
          {timedRows.length > 0 && <div className="timeline-list">{timedRows}</div>}

          {untimed.length > 0 && (
            <section className="untimed-section">
              <h2 className="section-label">NO TIME YET · {untimed.length}</h2>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={untimed.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="timeline-list">
                    {untimed.map(task => <SortableTaskCard key={task.id} {...cardProps(task)} />)}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}
        </>
      )}

      <button className="fab" onClick={() => onNewTask({ date: selectedDate })} aria-label="New task">
        <Icon name="plus" size={30} strokeWidth={3.5} />
      </button>

      {/* Calendar sheet: on mobile there is no sidebar, so the calendar opens from the top bar */}
      {showCalendar && (
        <div className="sheet-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowCalendar(false) }}>
          <div className="sheet" role="dialog" aria-label="Calendar">
            <button className="icon-btn sheet-close" onClick={() => setShowCalendar(false)} aria-label="Close calendar">
              <Icon name="x" size={18} strokeWidth={3} />
            </button>
            <MiniCalendar
              selectedDate={selectedDate}
              tasks={tasks}
              onSelect={date => { onSelectDate(date); setShowCalendar(false) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
