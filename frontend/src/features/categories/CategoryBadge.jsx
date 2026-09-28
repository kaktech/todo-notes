/**
 * CategoryBadge: small colored pill showing a category name.
 */
export default function CategoryBadge({ name, color }) {
  return (
    <span
      className="category-badge"
      style={{ backgroundColor: color + '22', color: color, border: `1px solid ${color}44` }}
    >
      {name}
    </span>
  )
}
