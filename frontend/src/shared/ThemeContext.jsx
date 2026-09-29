/**
 * ThemeContext: "system" | "light" | "dark" preference, saved in localStorage.
 * `resolved` is the actual look ("light" or "dark") — for "system" it follows the OS.
 * Light is the default for first-time visitors.
 */
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()
const MODES = ['system', 'light', 'dark']

function readMode() {
  try {
    const saved = localStorage.getItem('theme')
    return MODES.includes(saved) ? saved : 'light'
  } catch {
    return 'light'
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readMode)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Follow OS changes while in "system" mode
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = e => setSystemDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    try { localStorage.setItem('theme', mode) } catch { /* private mode */ }
    document.documentElement.setAttribute('data-theme', resolved)
  }, [mode, resolved])

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
