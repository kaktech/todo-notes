/**
 * Sample data: one click fills the app so every screen has something to show,
 * and one click puts it back to empty. Both work through the normal API.
 */
import { apiFetch } from '../../shared/api'
import { addDays, fromMinutes, minutesOfDay, todayStr } from '../../shared/dates'

async function send(method, path, body) {
  const res = await apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error(`${method} ${path} failed`)
  return res.status === 204 ? null : res.json()
}

export async function loadSampleData(userId) {
  const today = todayStr()
  // Keep the "happening now" schedule inside a normal day, whatever time it is
  const base = Math.min(Math.max(minutesOfDay(new Date()), 8 * 60), 19 * 60)
  const at = minutes => fromMinutes(Math.min(minutes, 22 * 60 + 30))

  const work = await send('POST', '/categories', { user_id: userId, name: 'Work', color: '#3B82F6' })
  const home = await send('POST', '/categories', { user_id: userId, name: 'Personal', color: '#22C55E' })
  const health = await send('POST', '/categories', { user_id: userId, name: 'Health', color: '#F472B6' })
  const focus = await send('POST', '/tags', { user_id: userId, name: 'focus' })
  const errands = await send('POST', '/tags', { user_id: userId, name: 'errands' })
  const quick = await send('POST', '/tags', { user_id: userId, name: 'quick' })

  const make = (task, tagIds = [], steps = []) => send('POST', '/tasks', {
    user_id: userId, due_date: today, priority: 'medium', ...task,
  }).then(async created => {
    for (const tag of tagIds) await send('POST', `/tags/tasks/${created.id}/tags/${tag.id}`)
    for (const title of steps) await send('POST', `/tasks/${created.id}/subtasks`, { title })
    return created
  })

  // Today: one running now, a few later, a few anytime, one already done
  await make({ title: 'Deep work: quarterly plan', start_time: at(base - 20), end_time: at(base + 70), category_id: work.id, priority: 'high', color: '#3B82F6', icon: 'target' },
    [focus], ['Outline the goals', 'Draft the timeline', 'Send for review'])
  await make({ title: 'Lunch with Sam', start_time: at(base + 120), end_time: at(base + 165), category_id: home.id, color: '#22C55E', icon: 'gift' })
  await make({ title: 'Gym session', start_time: at(base + 230), end_time: at(base + 290), category_id: health.id, color: '#F472B6', icon: 'bolt' })
  await make({ title: 'Call mum', start_time: at(base + 320), end_time: at(base + 335), color: '#38BDF8', icon: 'bell' }, [quick])
  await make({ title: 'Buy groceries', category_id: home.id, color: '#FB923C', icon: 'bag' }, [errands], ['Milk', 'Eggs', 'Coffee'])
  await make({ title: 'Read chapter 4', color: '#8B5CF6', icon: 'pencil' })
  await make({ title: 'Water the plants', recurrence: 'daily', color: '#14B8A6', icon: 'drop' }, [quick])
  const run = await make({ title: 'Morning run', start_time: '07:00', end_time: '07:30', category_id: health.id, color: '#F87171', icon: 'flame' })
  await send('PUT', `/tasks/${run.id}`, { completed: true })

  // Overdue, so the Slipped tray has something in it
  await make({ title: 'Send invoice', due_date: addDays(today, -2), category_id: work.id, priority: 'high', color: '#8B5CF6', icon: 'flag' }, [focus])
  await make({ title: 'Renew passport', due_date: addDays(today, -5), color: '#14B8A6', icon: 'key' }, [errands])

  // The rest of the week, so the Week board is not empty
  await make({ title: 'Design review', due_date: addDays(today, 1), start_time: '11:00', end_time: '12:00', category_id: work.id, color: '#3B82F6', icon: 'clipboard' })
  await make({ title: 'Dentist', due_date: addDays(today, 1), start_time: '08:30', end_time: '09:15', category_id: health.id, color: '#F87171', icon: 'drop' })
  await make({ title: 'Team offsite', due_date: addDays(today, 2), start_time: '10:00', end_time: '16:00', category_id: work.id, color: '#14B8A6', icon: 'globe' })
  await make({ title: 'Weekly review', due_date: addDays(today, 3), start_time: '16:00', end_time: '16:45', category_id: work.id, recurrence: 'weekly', color: '#6366F1', icon: 'bulb' })

  const notes = [
    ['Trip ideas', 'Lisbon in spring\nKyoto for the autumn leaves\nCheck flight prices on Tuesday'],
    ['Book list', 'The Pragmatic Programmer\nDeep Work\nA Pattern Language'],
    ['Quarterly plan: notes', 'Goals\n- Ship the new planner\n- Cut support tickets by a quarter\n\nRisks\n- Hiring is slower than planned'],
  ]
  for (const [title, content] of notes) await send('POST', '/notes', { user_id: userId, title, content })
}

/** Deletes every task, list, tag and note for this browser, back to the empty state. */
export async function clearEverything(userId) {
  const q = `user_id=${encodeURIComponent(userId)}`
  const [tasks, categories, tags, notes] = await Promise.all([
    send('GET', `/tasks?${q}`), send('GET', `/categories?${q}`), send('GET', `/tags?${q}`), send('GET', `/notes?${q}`),
  ])
  await Promise.all(tasks.map(t => send('DELETE', `/tasks/${t.id}`)))
  await Promise.all(categories.map(c => send('DELETE', `/categories/${c.id}`)))
  await Promise.all(tags.map(t => send('DELETE', `/tags/${t.id}`)))
  await Promise.all(notes.map(n => send('DELETE', `/notes/${n.id}`)))
}
