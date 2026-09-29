/**
 * App: theme provider + the app shell. No login — data belongs to this browser.
 */
import { ThemeProvider } from './shared/ThemeContext'
import AppShell from './shared/AppShell'
import './App.css'

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}
