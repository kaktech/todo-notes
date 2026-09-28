/**
 * FAB: Floating Action Button — circular "+" button, bottom-right.
 * Used to add a new task.
 */
export default function FAB({ onClick, label }) {
  return (
    <button className="fab" onClick={onClick} aria-label={label || 'Add new task'}>
      +
    </button>
  )
}
