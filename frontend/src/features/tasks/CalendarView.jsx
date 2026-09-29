/**
 * CalendarView: month grid showing tasks on their due dates.
 * Click a task to mark it complete.
 */
import { useState } from 'react'

export default function CalendarView({ tasks, onToggle }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  // Group tasks by date
  const tasksByDate = {}
  tasks.forEach(task => {
    if (task.due_date) {
      if (!tasksByDate[task.due_date]) tasksByDate[task.due_date] = []
      tasksByDate[task.due_date].push(task)
    }
  })

  // Navigate months
  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Build calendar grid
  const cells = []
  // Empty cells before first day
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null)
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day)
  }

  return (
    <div className="calendar-view">
      {/* Month navigation */}
      <div className="calendar-header">
        <button onClick={prevMonth} className="calendar-nav-btn">&#8249;</button>
        <h2 className="calendar-month">{monthNames[month]} {year}</h2>
        <button onClick={nextMonth} className="calendar-nav-btn">&#8250;</button>
      </div>

      {/* Day names */}
      <div className="calendar-grid">
        {dayNames.map(d => (
          <div key={d} className="calendar-day-name">{d}</div>
        ))}

        {/* Calendar cells */}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="calendar-cell empty" />
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayTasks = tasksByDate[dateStr] || []
          const isToday = dateStr === new Date().toISOString().split('T')[0]

          return (
            <div key={dateStr} className={`calendar-cell ${isToday ? 'today' : ''}`}>
              <span className="calendar-day-number">{day}</span>
              <div className="calendar-tasks">
                {dayTasks.map(task => (
                  <button
                    key={task.id}
                    className={`calendar-task ${task.completed ? 'completed' : ''}`}
                    onClick={() => onToggle(task)}
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
