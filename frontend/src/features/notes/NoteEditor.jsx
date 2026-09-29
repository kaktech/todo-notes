/**
 * NoteEditor: full-width editor with back button, auto-save (500ms after typing
 * stops) and a "Saved" indicator. Unsaved edits are flushed when you leave.
 */
import { useState, useEffect, useRef } from 'react'
import Icon from '../../shared/Icon'
import { formatUpdated } from '../../shared/dates'

export default function NoteEditor({ note, onSave, onDelete, onBack, hideBack = false }) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error

  // Refs so the debounce timer and the unmount flush always see the latest values
  const latest = useRef({ title, content })
  const dirty = useRef(false)
  const timer = useRef(null)
  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave })

  async function save() {
    clearTimeout(timer.current)
    const { title, content } = latest.current
    if (!dirty.current || !title.trim()) return // the API rejects empty titles
    dirty.current = false
    setStatus('saving')
    try {
      await onSaveRef.current(note.id, { title: title.trim(), content })
      setStatus('saved')
    } catch {
      dirty.current = true
      setStatus('error')
    }
  }

  function change(nextTitle, nextContent) {
    latest.current = { title: nextTitle, content: nextContent }
    dirty.current = true
    setStatus('idle')
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 500)
  }

  // Leaving the editor (back button, tab switch) must not lose the last keystrokes
  useEffect(() => () => {
    clearTimeout(timer.current)
    const { title, content } = latest.current
    if (dirty.current && title.trim()) onSaveRef.current(note.id, { title: title.trim(), content }).catch(() => {})
  }, [note.id])

  return (
    <div className="note-editor">
      <div className="editor-bar">
        {hideBack ? <span /> : (
          <button className="icon-btn" onClick={onBack} aria-label="Back to notes">
            <Icon name="arrow-left" size={20} strokeWidth={3} />
          </button>
        )}
        <span className={`save-status ${status}`} aria-live="polite">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && <><Icon name="check" size={14} strokeWidth={3.5} /> Saved</>}
          {status === 'error' && 'Not saved'}
        </span>
        <button className="icon-btn icon-btn-danger" onClick={() => onDelete(note.id)} aria-label="Delete note">
          <Icon name="trash" size={18} />
        </button>
      </div>

      <input
        type="text"
        className="note-title-input"
        value={title}
        onChange={e => { setTitle(e.target.value); change(e.target.value, content) }}
        placeholder="Title"
        aria-label="Note title"
      />
      <p className="note-updated">Updated {formatUpdated(note.updated_at)}</p>
      <textarea
        className="note-content-input"
        value={content}
        onChange={e => { setContent(e.target.value); change(title, e.target.value) }}
        placeholder="Start typing"
        aria-label="Note content"
      />
    </div>
  )
}
