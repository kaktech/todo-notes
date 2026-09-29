/**
 * Sidebar: left panel with menu, task views, lists, tags, and settings.
 * Replaces the old NavBar.
 */
import { useState } from 'react'
import { useTheme } from './ThemeContext'
import { apiFetch } from './api'

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
  const [newListColor, setNewListColor] = useState('#3B82F6')
  const [newTagName, setNewTagName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [showNewTag, setShowNewTag] = useState(false)

  // Handle creating a new list/category
  async function handleAddList(e) {
    e.preventDefault()
    if (!newListName.trim()) return
    const userId = localStorage.getItem('user_id')
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name: newListName.trim(), color: newListColor }),
    })
    if (res.ok) {
      const cat = await res.json()
      // Call parent's onAddCategory to update state
      onAddCategory(newListName.trim(), newListColor)
    }
    setNewListName('')
    setNewListColor('#3B82F6')
    setShowNewList(false)
  }

  // Handle creating a new tag
  async function handleAddTag(e) {
    e.preventDefault()
    if (!newTagName.trim()) return
    const userId = localStorage.getItem('user_id')
    const res = await apiFetch('/tags', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name: newTagName.trim() }),
    })
    if (res.ok) {
      const tag = await res.json()
      onAddTag(newTagName.trim())
    }
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
          className={`sidebar-item ${view === 'overdue' ? 'active' : ''}`}
          onClick={() => onViewChange('overdue')}
        >
          <span className="sidebar-item-icon">&#9888;</span>
          <span>Overdue</span>
          <span className="count-badge">{taskCounts.overdue || 0}</span>
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
          <div
            key={cat.id}
            className={`sidebar-item-wrapper ${view === `list-${cat.id}` ? 'active' : ''}`}
          >
            <button
              className="sidebar-item"
              onClick={() => onViewChange(`list-${cat.id}`)}
            >
              <span className="colored-dot" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
              <span className="count-badge">{taskCounts[`list-${cat.id}`] || 0}</span>
            </button>
            <button
              className="list-delete-btn"
              onClick={() => {
                if (window.confirm(`Delete list "${cat.name}"? Tasks will be moved to "No List".`)) {
                  onDeleteCategory(cat.id)
                }
              }}
              aria-label={`Delete list ${cat.name}`}
              title="Delete list"
            >
              &#10005;
            </button>
          </div>
        ))}

        {/* Add new list */}
        {showNewList ? (
          <form onSubmit={handleAddList} className="sidebar-add-form">
            <div className="sidebar-add-row">
              <input
                type="color"
                value={newListColor}
                onChange={e => setNewListColor(e.target.value)}
                className="color-picker"
                title="Choose list color"
              />
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="List name"
                className="sidebar-add-input"
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-small">Add</button>
            </div>
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

      {/* Bottom section — just theme toggle */}
      <div className="sidebar-bottom">
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
