/**
 * DatePicker: horizontal row of rounded-rectangle date pills.
 * Shows day name (small) on top, day number (large) below.
 * Selected day has solid highlighted background.
 * Has left/right arrow buttons to scroll through dates.
 */
import { useRef } from 'react'

export default function DatePicker({ selectedDate, onSelect }) {
  const scrollRef = useRef(null)

  // Generate 14 days starting from today
  const days = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  // Scroll left or right by one pill width
  function scroll(direction) {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 90, behavior: 'smooth' })
    }
  }

  return (
    <div className="date-picker-wrapper">
      {/* Left arrow */}
      <button className="date-arrow" onClick={() => scroll(-1)} aria-label="Scroll dates left">
        &#8249;
      </button>

      {/* Date pills */}
      <div className="date-pills" ref={scrollRef}>
        {days.map((date, i) => {
          const dateStr = date.toISOString().split('T')[0]
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={i}
              className={`date-pill ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(dateStr)}
            >
              <span className="day-name">{dayNames[date.getDay()]}</span>
              <span className="day-number">{date.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Right arrow */}
      <button className="date-arrow" onClick={() => scroll(1)} aria-label="Scroll dates right">
        &#8250;
      </button>
    </div>
  )
}
