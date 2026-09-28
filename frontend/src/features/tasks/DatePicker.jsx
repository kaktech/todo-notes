/**
 * DatePicker: horizontal row of rounded-rectangle date pills.
 * Shows day name (small) on top, day number (large) below.
 * Selected day has solid highlighted background.
 */
export default function DatePicker({ selectedDate, onSelect }) {
  // Generate 7 days starting from today
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  return (
    <div className="date-pills">
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
  )
}
