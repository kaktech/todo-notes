/**
 * DateStrip: month header (month + year pill, TODAY, prev/next week) and a
 * scrollable row of day cards. Selected = sky, today (if not selected) = blue.
 */
import { useEffect, useRef } from 'react'
import Icon from '../../shared/Icon'
import { MONTHS, DAYS_SHORT, fromDateStr, addDays, todayStr } from '../../shared/dates'

const DAYS_BEFORE = 7
const DAYS_AFTER = 21

export default function DateStrip({ selectedDate, onSelect, onOpenCalendar }) {
  const stripRef = useRef(null)
  const today = todayStr()
  const selected = fromDateStr(selectedDate)

  // Keep the selected card in view (scrolls only the strip, never the page)
  useEffect(() => {
    const strip = stripRef.current
    const card = strip?.querySelector('.date-card.selected')
    if (strip && card) {
      strip.scrollTo({ left: card.offsetLeft - strip.clientWidth / 2 + card.clientWidth / 2, behavior: 'smooth' })
    }
  }, [selectedDate])

  const days = []
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) days.push(addDays(selectedDate, i))

  return (
    <div className="date-strip-block">
      <div className="topbar">
        <div className="topbar-month">
          <span className="topbar-month-name">{MONTHS[selected.getMonth()].toUpperCase()}</span>
          <span className="year-pill">{selected.getFullYear()}</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn mobile-only" onClick={onOpenCalendar} aria-label="Open calendar">
            <Icon name="calendar" size={18} />
          </button>
          <button className="btn btn-small btn-primary" onClick={() => onSelect(today)}>TODAY</button>
          <button className="icon-btn" onClick={() => onSelect(addDays(selectedDate, -7))} aria-label="Previous week">
            <Icon name="chevron-left" size={18} strokeWidth={3} />
          </button>
          <button className="icon-btn" onClick={() => onSelect(addDays(selectedDate, 7))} aria-label="Next week">
            <Icon name="chevron-right" size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="date-strip" ref={stripRef}>
        {days.map(dateStr => {
          const d = fromDateStr(dateStr)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today
          // The 1st of a month shows the month name so the strip is easy to read
          const label = d.getDate() === 1 ? MONTHS[d.getMonth()].slice(0, 3).toUpperCase() : DAYS_SHORT[d.getDay()]
          return (
            <button
              key={dateStr}
              className={`date-card ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
              onClick={() => onSelect(dateStr)}
              aria-pressed={isSelected}
              aria-label={d.toDateString()}
            >
              <span className="date-card-name">{label}</span>
              <span className="date-card-number">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
