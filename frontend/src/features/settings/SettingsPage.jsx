/**
 * SettingsPage: appearance, lists, tags, data.
 * Lists and tags live here because there is no sidebar on mobile.
 */
import { useState } from 'react'
import Icon from '../../shared/Icon'
import { useTheme } from '../../shared/ThemeContext'
import { TASK_COLORS } from '../../theme/colors'

const MODES = [
  { id: 'system', label: 'System', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
]

function ListRow({ category, onUpdate, onDelete }) {
  const [name, setName] = useState(category.name)

  function commitName() {
    const trimmed = name.trim()
    if (!trimmed) { setName(category.name); return }
    if (trimmed !== category.name) onUpdate(category.id, { name: trimmed })
  }

  return (
    <div className="list-row">
      <div className="list-row-top">
        <span className="dot dot-large" style={{ background: category.color }} />
        <input
          className="field-input list-name-input"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          aria-label={`Rename list ${category.name}`}
        />
        <button className="icon-btn icon-btn-danger icon-btn-small" onClick={() => onDelete(category)} aria-label={`Delete list ${category.name}`}>
          <Icon name="trash" size={16} />
        </button>
      </div>
      <div className="color-row color-row-small">
        {TASK_COLORS.map(c => (
          <button
            key={c.value}
            className={`color-dot ${category.color.toLowerCase() === c.value.toLowerCase() ? 'active' : ''}`}
            style={{ background: c.value }}
            onClick={() => onUpdate(category.id, { color: c.value })}
            aria-label={`${c.name} for ${category.name}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage({ taskCount, onDeleteAllTasks, listApi, tagApi }) {
  const { mode, setMode } = useTheme()
  const [newList, setNewList] = useState('')
  const [newListColor, setNewListColor] = useState(TASK_COLORS[0].value)
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')

  async function run(action) {
    try {
      setError('')
      await action()
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    }
  }

  async function addList(e) {
    e.preventDefault()
    if (!newList.trim()) return
    await run(() => listApi.addCategory(newList.trim(), newListColor))
    setNewList('')
  }

  async function addTag(e) {
    e.preventDefault()
    if (!newTag.trim()) return
    await run(() => tagApi.createTag(newTag.trim()))
    setNewTag('')
  }

  function deleteList(category) {
    if (window.confirm(`Delete the list "${category.name}"?`)) run(() => listApi.deleteCategory(category.id))
  }

  function deleteAll() {
    if (taskCount === 0) return
    if (window.confirm(`Delete all ${taskCount} tasks? This cannot be undone.`)) run(onDeleteAllTasks)
  }

  return (
    <div className="view settings-page">
      <header className="page-head">
        <h1 className="hero-title">Setup</h1>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="settings-section">
        <h2 className="eyebrow section">Appearance</h2>
        <div className="segmented segmented-tall" role="group" aria-label="Appearance">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`segment segment-icon ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
            >
              <Icon name={m.icon} size={22} />
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="eyebrow section">Lists</h2>
        <div className="settings-card">
          {listApi.categories.length === 0 && <p className="soft">No lists yet. Lists group related tasks.</p>}
          {listApi.categories.map(cat => (
            <ListRow
              key={cat.id}
              category={cat}
              onUpdate={(id, updates) => run(() => listApi.updateCategory(id, updates))}
              onDelete={deleteList}
            />
          ))}
          <form className="add-row" onSubmit={addList}>
            <input className="field-input" value={newList} onChange={e => setNewList(e.target.value)} placeholder="New list name" aria-label="New list name" />
            <select
              className="field-input color-select"
              value={newListColor}
              onChange={e => setNewListColor(e.target.value)}
              aria-label="New list colour"
              style={{ borderLeftColor: newListColor }}
            >
              {TASK_COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
            <button className="btn btn-small btn-primary" type="submit">Add</button>
          </form>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="eyebrow section">Tags</h2>
        <div className="settings-card">
          <div className="tag-row">
            {tagApi.tags.length === 0 && <p className="soft">No tags yet.</p>}
            {tagApi.tags.map(tag => (
              <span key={tag.id} className="tag-pill">
                {tag.name}
                <button className="tag-remove" onClick={() => run(() => tagApi.deleteTag(tag.id))} aria-label={`Delete tag ${tag.name}`}>
                  <Icon name="x" size={12} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
          <form className="add-row" onSubmit={addTag}>
            <input className="field-input" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New tag name" aria-label="New tag name" />
            <button className="btn btn-small btn-primary" type="submit">Add</button>
          </form>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="eyebrow section">Your data</h2>
        <button className="danger-row" onClick={deleteAll} disabled={taskCount === 0}>
          <Icon name="trash" size={22} />
          <span className="danger-row-label">Clear every task</span>
          <span className="count-badge">{taskCount}</span>
        </button>
        <p className="caption">Everything is saved for this browser only. A new browser starts empty.</p>
      </section>
    </div>
  )
}
