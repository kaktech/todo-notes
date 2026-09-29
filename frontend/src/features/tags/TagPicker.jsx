/**
 * TagPicker: attached tags as pills, plus a small panel to pick or create tags.
 * onCreate must return the new tag (or null) — it is attached straight away.
 */
import { useState } from 'react'
import Icon from '../../shared/Icon'

export default function TagPicker({ tags, selectedTagIds, onAttach, onDetach, onCreate }) {
  const [open, setOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id))
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id))

  async function handleCreate() {
    const name = newTagName.trim()
    if (!name) return
    const tag = await onCreate(name)
    if (tag) {
      await onAttach(tag.id)
      setNewTagName('')
      setOpen(false)
    }
  }

  return (
    <div className="tag-picker">
      <div className="tag-row">
        {selectedTags.map(tag => (
          <span key={tag.id} className="tag-pill">
            {tag.name}
            <button type="button" className="tag-remove" onClick={() => onDetach(tag.id)} aria-label={`Remove tag ${tag.name}`}>
              <Icon name="x" size={12} strokeWidth={3} />
            </button>
          </span>
        ))}
        <button type="button" className="tag-pill tag-add" onClick={() => setOpen(!open)}>
          <Icon name="plus" size={12} strokeWidth={3} /> Tag
        </button>
      </div>

      {open && (
        <div className="tag-panel">
          <div className="subtask-add-row">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
              placeholder="New tag name"
              className="field-input"
              autoFocus
            />
            <button type="button" className="btn btn-small" onClick={handleCreate}>Create</button>
          </div>
          {availableTags.length > 0 && (
            <div className="tag-row">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-pill"
                  onClick={() => { onAttach(tag.id); setOpen(false) }}
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
