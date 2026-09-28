/**
 * ThemeContext: provides dark/light mode state to the whole app.
 * Persists the user's choice in localStorage.
 * Light mode is the default (matches reference screenshot).
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { themes } from '../theme/colors'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Check localStorage for saved theme, default to light
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  // Save theme choice and apply to DOM
  useEffect(() => {
    localStorage.setItem('theme', mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'))
  const colors = themes[mode]

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
