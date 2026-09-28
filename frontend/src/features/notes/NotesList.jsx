/**
 * NotesList: left panel showing all notes with search.
 */
export default function NotesList({ notes, selectedId, onSelect, onNew, search, onSearch }) {
  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="notes-list-panel">
      <div className="notes-list-header">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="search-input"
        />
        <button onClick={onNew} className="btn btn-primary btn-small">+ New</button>
      </div>

      {notes.length === 0 && (
        <div className="empty-state">No notes yet, create your first one!</div>
      )}

      <ul className="notes-list">
        {notes.map(note => (
          <li
            key={note.id}
            className={selectedId === note.id ? 'note-item selected' : 'note-item'}
            onClick={() => onSelect(note)}
          >
            <div className="note-item-title">{note.title}</div>
            <div className="note-item-date">{formatDate(note.updated_at)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
