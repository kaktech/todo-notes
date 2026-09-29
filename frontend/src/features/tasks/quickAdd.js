/**
 * Quick add parser: turns "gym tomorrow 6pm for an hour" into
 * { title: "Gym", date: "2026-09-30", start: "18:00", duration: 60 }.
 * Anything it cannot find comes back as null. The matched words are removed from the title.
 * Dates like 5/10 are read as day/month.
 */
import { toDateStr, addDays } from '../../shared/dates'

const WEEKDAYS = [
  ['sunday', 'sun'], ['monday', 'mon'], ['tuesday', 'tues', 'tue'], ['wednesday', 'wed'],
  ['thursday', 'thurs', 'thur', 'thu'], ['friday', 'fri'], ['saturday', 'sat'],
]
const MONTH_WORDS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAY_RE = WEEKDAYS.flat().sort((a, b) => b.length - a.length).join('|')
const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'

function weekdayIndex(word) {
  const w = word.toLowerCase()
  return WEEKDAYS.findIndex(names => names.includes(w))
}

export function parseQuickAdd(input, now = new Date()) {
  let text = ` ${input} `
  const result = { title: '', date: null, start: null, duration: null }
  const today = toDateStr(now)

  // Find the first match, blank it out of the text, and hand the match to `apply`
  function take(re, apply) {
    const m = text.match(re)
    if (!m) return false
    text = text.replace(re, ' ')
    apply(m)
    return true
  }

  // ---- duration (before time, so "1h30" is not read as a clock time) ----
  take(/\bfor\s+half\s+an?\s+hour\b/i, () => { result.duration = 30 }) ||
  take(/\bfor\s+(an?|\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b(?:\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?|m)\b)?/i, m => {
    const hours = /^an?$/i.test(m[1]) ? 1 : parseFloat(m[1])
    result.duration = Math.round(hours * 60) + (m[2] ? parseInt(m[2], 10) : 0)
  }) ||
  take(/\bfor\s+(\d+)\s*(?:minutes?|mins?|m)\b/i, m => { result.duration = parseInt(m[1], 10) }) ||
  take(/\b(\d+)h(\d{1,2})m?\b/i, m => { result.duration = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) }) ||
  take(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i, m => { result.duration = Math.round(parseFloat(m[1]) * 60) }) ||
  take(/\b(\d+)\s*(?:minutes?|mins?|m)\b/i, m => { result.duration = parseInt(m[1], 10) })

  // ---- time ----
  const clock = (h, min = 0) => `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  take(/\b(noon|midday)\b/i, () => { result.start = '12:00' }) ||
  take(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, m => {
    let h = parseInt(m[1], 10) % 12
    if (m[3].toLowerCase() === 'pm') h += 12
    result.start = clock(h, m[2] ? parseInt(m[2], 10) : 0)
  }) ||
  take(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, m => { result.start = clock(parseInt(m[1], 10), parseInt(m[2], 10)) }) ||
  take(/\bat\s+(\d{1,2})\b/i, m => {
    let h = parseInt(m[1], 10)
    if (h >= 1 && h <= 6) h += 12 // "at 5" almost always means the afternoon
    if (h <= 23) result.start = clock(h)
    else text += ` at ${m[1]}` // not a time after all, keep it in the title
  })

  // ---- date ----
  let date = null
  if (take(/\b(?:tomorrow|tmrw|tmr)\b/i, () => { date = addDays(today, 1) })) { /* done */ }
  else if (take(/\btonight\b/i, () => { date = today; if (!result.start) result.start = '20:00' })) { /* done */ }
  else if (take(/\btoday\b/i, () => { date = today })) { /* done */ }
  else if (take(/\bin\s+(\d+)\s+(day|days|week|weeks)\b/i, m => {
    date = addDays(today, parseInt(m[1], 10) * (m[2].toLowerCase().startsWith('week') ? 7 : 1))
  })) { /* done */ }
  else if (take(/\bnext\s+week\b/i, () => { date = addDays(today, 7) })) { /* done */ }
  else if (take(new RegExp(`\\b(?:on\\s+|next\\s+)?(${WEEKDAY_RE})\\b`, 'i'), m => {
    const wanted = weekdayIndex(m[1])
    let diff = (wanted - now.getDay() + 7) % 7
    if (diff === 0) diff = 7
    date = addDays(today, diff)
  })) { /* done */ }
  else {
    const monthDay = (monthWord, dayNum) => {
      const month = MONTH_WORDS.indexOf(monthWord.slice(0, 3).toLowerCase())
      let candidate = new Date(now.getFullYear(), month, dayNum)
      if (toDateStr(candidate) < today) candidate = new Date(now.getFullYear() + 1, month, dayNum)
      date = toDateStr(candidate)
    }
    take(new RegExp(`\\b(?:on\\s+)?(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'), m => monthDay(m[1], parseInt(m[2], 10))) ||
    take(new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})\\b`, 'i'), m => monthDay(m[2], parseInt(m[1], 10))) ||
    take(/\b(\d{1,2})\/(\d{1,2})\b/, m => {
      const d = parseInt(m[1], 10)
      const mo = parseInt(m[2], 10)
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) monthDay(MONTH_WORDS[mo - 1], d)
      else text += ` ${m[0]}`
    })
  }
  result.date = date

  // ---- title: what is left, tidied ----
  let title = text
    .replace(/\s+/g, ' ')
    .replace(/^(?:\s*(?:at|on|by|for|from|-|,)\s+)+/i, ' ')
    .replace(/(?:\s+(?:at|on|by|for|from|-|,))+\s*$/i, ' ')
    .trim()
  if (!title) title = input.trim()
  result.title = title.charAt(0).toUpperCase() + title.slice(1)
  return result
}
