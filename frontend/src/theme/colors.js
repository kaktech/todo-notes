/**
 * Theme color values for dark and light mode.
 * Modernist/Editorial design — bold typography, minimal color, cream backgrounds.
 * Light mode is the default (matches reference screenshot).
 */
export const themes = {
  light: {
    background: '#F5F3EF',       // soft cream/off-white page background
    card: '#FFFFFF',            // card/panel background
    row: '#EDEAE4',              // task row background (slightly darker than page)
    primary: '#1A1A1A',          // near-black for headings and selected states
    text: '#1A1A1A',             // main text color
    textMuted: '#9CA3AF',        // muted text
    accent: '#C97B4A',           // terracotta accent for section labels
    accentDark: '#1A1A1A',       // selected date pill background
    accentDarkText: '#FFFFFF',   // text on selected date pill
    border: '#E5E2DC',           // subtle borders
    shadow: 'none',              // no heavy shadows — flat design
  },
  dark: {
    background: '#17171A',       // dark page background
    card: '#1E1E22',            // card/panel background
    row: '#232326',              // task row background
    primary: '#F1F1F1',          // near-white for headings
    text: '#F1F1F1',             // main text color
    textMuted: '#6B6B70',        // muted text
    accent: '#E0975E',           // warmer orange for dark mode
    accentDark: '#F1F1F1',       // selected date pill background
    accentDarkText: '#17171A',   // text on selected date pill
    border: '#2E2E33',           // subtle borders
    shadow: 'none',              // no heavy shadows
  },
}
