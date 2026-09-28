/**
 * TagPicker: dropdown to select and attach tags to a task.
 * Shows available tags and allows adding new ones.
 */
import { useState } from 'react'

export default function TagPicker({ tags, selectedTagIds, onAttach, onDetach }) {
  const [showDropdown, setShowDropdown] = useState(false)

  // Tags not yet attached to this task
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id))

  return (
    <div className="tag-picker">
      <div className="tag-picker-label">Tags</div>
      <div className="tag-picker-row">
        {/* Attached tags */}
        {selectedTagIds.map(tagId => {
          const tag = tags.find(t => t.id === tagId)
          if (!tag) return null
          return (
            <span key={tagId} className="tag-pill attached">
              {tag.name}
              <button className="tag-remove" onClick={() => onDetach(tagId)}>&times;</button>
            </span>
          )
        })}

        {/* Add tag button */}
        <button className="tag-pill tag-add" onClick={() => setShowDropdown(!showDropdown)}>
          + Add Tag
        </button>
      </div>

      {/* Dropdown with available tags */}
      {showDropdown && availableTags.length > 0 && (
        <div className="tag-dropdown">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              className="tag-dropdown-item"
              onClick={() => { onAttach(tag.id); setShowDropdown(false) }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
