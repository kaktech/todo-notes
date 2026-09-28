/**
 * CategoryPicker: dropdown to select a category for a task.
 */
export default function CategoryPicker({ categories, value, onChange }) {
  return (
    <select
      className="category-picker"
      value={value || ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
    >
      <option value="">No category</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  )
}
