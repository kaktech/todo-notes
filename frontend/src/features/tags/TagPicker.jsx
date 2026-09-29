/**
 * TagPicker: dropdown to select and attach tags to a task.
 * Shows available tags, allows creating new ones inline.
 */
import { useState } from 'react'

export default function TagPicker({ tags, selectedTagIds, onAttach, onDetach, onCreate }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // Tags not yet attached to this task
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id))

  // Get full tag objects for selected tags
  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id))

  // Handle creating a new tag
  async function handleCreate(e) {
    e.preventDefault()
    const name = newTagName.trim()
    if (!name) return
    const newTag = await onCreate(name)
    if (newTag) {
      onAttach(newTag.id)
      setNewTagName('')
      setShowDropdown(false)
    }
  }

  return (
    <div className="tag-picker">
      <div className="tag-picker-label">Tags</div>
      <div className="tag-picker-row">
        {/* Attached tags */}
        {selectedTags.map(tag => (
          <span key={tag.id} className="tag-pill attached">
            {tag.name}
            <button className="tag-remove" onClick={() => onDetach(tag.id)}>&times;</button>
          </span>
        ))}

        {/* Add tag button */}
        <button className="tag-pill tag-add" onClick={() => setShowDropdown(!showDropdown)}>
          + Add Tag
        </button>
      </div>

      {/* Dropdown with create input + existing tags */}
      {showDropdown && (
        <div className="tag-dropdown">
          {/* Create new tag form */}
          <form onSubmit={handleCreate} className="tag-create-form">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="New tag name..."
              className="tag-create-input"
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-small">Create</button>
          </form>

          {/* Existing tags to pick from */}
          {availableTags.length > 0 && (
            <div className="tag-dropdown-list">
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
      )}
    </div>
  )
}
