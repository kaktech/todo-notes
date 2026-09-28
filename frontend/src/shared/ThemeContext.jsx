/**
 * ThemeContext: provides dark/light mode state to the whole app.
 * Persists the user's choice in localStorage.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { themes } from '../theme/colors'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Check localStorage for saved theme, default to dark
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  // Save theme choice and apply to DOM whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  // Toggle between dark and light
  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'))

  // Current theme colors
  const colors = themes[mode]

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook so any component can access theme
export function useTheme() {
  return useContext(ThemeContext)
}
