/**
 * Sidebar: left panel with menu, task views, lists, tags, and settings.
 * Replaces the old NavBar.
 */
import { useState } from 'react'
import { useTheme } from './ThemeContext'

export default function Sidebar({
  view,
  onViewChange,
  categories,
  tags,
  taskCounts,
  onAddCategory,
  onAddTag,
  onSearch,
}) {
  const { mode, toggle } = useTheme()
  const [newListName, setNewListName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [showNewTag, setShowNewTag] = useState(false)

  // Handle creating a new list/category
  async function handleAddList(e) {
    e.preventDefault()
    if (!newListName.trim()) return
    await onAddCategory(newListName.trim())
    setNewListName('')
    setShowNewList(false)
  }

  // Handle creating a new tag
  async function handleAddTag(e) {
    e.preventDefault()
    if (!newTagName.trim()) return
    await onAddTag(newTagName.trim())
    setNewTagName('')
    setShowNewTag(false)
  }

  return (
    <aside className="sidebar">
      {/* Menu heading + hamburger */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Menu</h2>
        <button className="hamburger" aria-label="Toggle menu">&#9776;</button>
      </div>

      {/* Search bar */}
      <div className="sidebar-search">
        <span className="search-icon">&#128269;</span>
        <input
          type="text"
          placeholder="Search"
          onChange={e => onSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* TASKS section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Tasks</div>

        <button
          className={`sidebar-item ${view === 'upcoming' ? 'active' : ''}`}
          onClick={() => onViewChange('upcoming')}
        >
          <span className="sidebar-item-icon">&#8250;</span>
          <span>Upcoming</span>
          <span className="count-badge">{taskCounts.upcoming || 0}</span>
        </button>

        <button
          className={`sidebar-item ${view === 'today' ? 'active' : ''}`}
          onClick={() => onViewChange('today')}
        >
          <span className="sidebar-item-icon">&#9776;</span>
          <span>Today</span>
          <span className="count-badge">{taskCounts.today || 0}</span>
        </button>

        <button
          className={`sidebar-item ${view === 'calendar' ? 'active' : ''}`}
          onClick={() => onViewChange('calendar')}
        >
          <span className="sidebar-item-icon">&#128197;</span>
          <span>Calendar</span>
        </button>

        <button
          className={`sidebar-item ${view === 'notes' ? 'active' : ''}`}
          onClick={() => onViewChange('notes')}
        >
          <span className="sidebar-item-icon">&#128221;</span>
          <span>Notes</span>
        </button>
      </div>

      {/* LISTS section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Lists</div>

        {categories.map(cat => (
          <button
            key={cat.id}
            className={`sidebar-item ${view === `list-${cat.id}` ? 'active' : ''}`}
            onClick={() => onViewChange(`list-${cat.id}`)}
          >
            <span className="colored-dot" style={{ backgroundColor: cat.color }} />
            <span>{cat.name}</span>
            <span className="count-badge">{taskCounts[`list-${cat.id}`] || 0}</span>
          </button>
        ))}

        {/* Add new list */}
        {showNewList ? (
          <form onSubmit={handleAddList} className="sidebar-add-form">
            <input
              type="text"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="List name"
              className="sidebar-add-input"
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-small">Add</button>
          </form>
        ) : (
          <button className="sidebar-item sidebar-add" onClick={() => setShowNewList(true)}>
            <span className="sidebar-item-icon">+</span>
            <span>Add New List</span>
          </button>
        )}
      </div>

      {/* TAGS section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Tags</div>
        <div className="sidebar-tags">
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`tag-pill ${view === `tag-${tag.id}` ? 'active' : ''}`}
              onClick={() => onViewChange(`tag-${tag.id}`)}
            >
              {tag.name}
            </button>
          ))}
          {showNewTag ? (
            <form onSubmit={handleAddTag} className="sidebar-add-form">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="sidebar-add-input"
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-small">Add</button>
            </form>
          ) : (
            <button className="tag-pill tag-add" onClick={() => setShowNewTag(true)}>
              + Add Tag
            </button>
          )}
        </div>
      </div>

      {/* Bottom section — Settings, Sign out, theme toggle */}
      <div className="sidebar-bottom">
        <button className="sidebar-item">
          <span className="sidebar-item-icon">&#9881;</span>
          <span>Settings</span>
        </button>
        <button className="sidebar-item">
          <span className="sidebar-item-icon">&#8618;</span>
          <span>Sign out</span>
        </button>

        {/* Dark/Light toggle */}
        <button
          className={`toggle-switch ${mode === 'dark' ? 'on' : ''}`}
          onClick={toggle}
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="toggle-circle" />
        </button>
      </div>
    </aside>
  )
}
