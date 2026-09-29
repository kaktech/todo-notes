/**
 * CategoryPicker: dropdown to choose a list for a task.
 */
export default function CategoryPicker({ categories, value, onChange }) {
  return (
    <select
      className="field-input"
      value={value || ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
    >
      <option value="">No list</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  )
}
