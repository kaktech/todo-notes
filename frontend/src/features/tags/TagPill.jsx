/**
 * TagPill: small grey pill showing a tag name.
 * Used in the sidebar and in the task detail panel.
 */
export default function TagPill({ name, onRemove }) {
  return (
    <span className="tag-pill">
      {name}
      {onRemove && (
        <button className="tag-remove" onClick={onRemove} aria-label={`Remove tag ${name}`}>
          &times;
        </button>
      )}
    </span>
  )
}
