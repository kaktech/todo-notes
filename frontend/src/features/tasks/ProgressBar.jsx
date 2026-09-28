/**
 * ProgressBar: shows "X of Y tasks completed" with a horizontal bar.
 * Displays an encouraging message when near completion.
 */
export default function ProgressBar({ completed, total }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Encouraging message based on progress
  let message = ''
  if (total === 0) {
    message = 'Add your first task to get started!'
  } else if (percent === 100) {
    message = 'All done! Great job!'
  } else if (percent >= 75) {
    message = 'Almost there!'
  } else if (percent >= 50) {
    message = 'Halfway there!'
  } else if (percent > 0) {
    message = 'Good start!'
  }

  return (
    <div className="progress-section">
      <div className="progress-header">
        <span className="progress-text">
          {completed} of {total} tasks completed
        </span>
        <span className="progress-percent">{percent}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {message && <p className="progress-message">{message}</p>}
    </div>
  )
}
