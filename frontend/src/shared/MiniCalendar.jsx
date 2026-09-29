/**
 * MiniCalendar: month calendar (Monday first) that stays in sync with the selected date.
 * Round day buttons with a small dot under days that have tasks:
 *   blue dot = open tasks, red dot = overdue tasks, green dot = everything done.
 * Selected day = filled blue, today = sky ring.
 */
import { useState, useEffect, useMemo } from 'react'
import Icon from './Icon'
import { MONTHS, fromDateStr, toDateStr, todayStr } from './dates'

const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function MiniCalendar({ selectedDate, onSelect, tasks = [] }) {
  const selected = fromDateStr(selectedDate)
  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() })
  const today = todayStr()

  // Follow the selected date when it moves to another month (date strip, TODAY, arrows)
  useEffect(() => {
    const d = fromDateStr(selectedDate)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }, [selectedDate])

  // date -> { open, done } so each day can show a status dot
  const dayInfo = useMemo(() => {
    const info = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      const entry = info[t.due_date] || (info[t.due_date] = { open: 0, done: 0 })
      if (t.completed) entry.done += 1
      else entry.open += 1
    }
    return info
  }, [tasks])

  function shiftMonth(delta) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  // 6 weeks starting on the Monday on/before the 1st, so the grid never jumps in height
  const first = new Date(view.year, view.month, 1)
  const offset = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < 42; i++) cells.push(new Date(view.year, view.month, 1 - offset + i))

  function dotFor(dateStr) {
    const info = dayInfo[dateStr]
    if (!info) return null
    if (info.open > 0) return dateStr < today ? 'overdue' : 'open'
    return 'done'
  }

  return (
    <div className="cal">
      <div className="cal-header">
        <div className="cal-title">
          <span className="cal-month">{MONTHS[view.month]}</span>
          <span className="cal-year">{view.year}</span>
        </div>
        <div className="cal-nav">
          <button className="icon-btn icon-btn-small" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <Icon name="chevron-left" size={14} strokeWidth={3} />
          </button>
          <button className="icon-btn icon-btn-small" onClick={() => shiftMonth(1)} aria-label="Next month">
            <Icon name="chevron-right" size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {WEEK.map(w => <span key={w} className="cal-weekday">{w}</span>)}
        {cells.map(d => {
          const dateStr = toDateStr(d)
          const dot = dotFor(dateStr)
          return (
            <button
              key={dateStr}
              className={[
                'cal-day',
                d.getMonth() !== view.month ? 'outside' : '',
                dateStr === selectedDate ? 'selected' : '',
                dateStr === today ? 'today' : '',
              ].join(' ')}
              onClick={() => onSelect(dateStr)}
              aria-label={`${d.toDateString()}${dot ? `, ${dot === 'overdue' ? 'overdue tasks' : dot === 'open' ? 'open tasks' : 'all done'}` : ''}`}
              aria-pressed={dateStr === selectedDate}
            >
              <span className="cal-day-num">{d.getDate()}</span>
              {dot && <span className={`cal-dot ${dot}`} />}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        <span><i className="cal-dot open" /> Open</span>
        <span><i className="cal-dot overdue" /> Overdue</span>
        <span><i className="cal-dot done" /> Done</span>
      </div>
    </div>
  )
}
