import { useCallback, useEffect, useState } from 'react'
import { AlarmClock, X } from 'lucide-react'
import { api } from '../lib/api'
import { subscribe } from '../lib/realtime'

const SEEN_KEY = 'wheelsync-seen-return-reminders'

function readSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function writeSeen(seen) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-50)))
  } catch {
    // private window: the reminder may pop up again after a reload, which is harmless
  }
}

// Pop-up when the customer's rental is due back in 2 hours or 30 minutes.
export default function ReturnReminderPopups() {
  const [popups, setPopups] = useState([])

  const check = useCallback(async () => {
    try {
      const latest = await api.get('/notifications', { limit: 10 })
      const seen = readSeen()
      const fresh = latest.filter((item) => item.kind?.startsWith('return_reminder_') && !item.is_read && !seen.has(item.id))
      if (!fresh.length) return
      fresh.forEach((item) => seen.add(item.id))
      writeSeen(seen)
      setPopups((current) => [...fresh.filter((item) => !current.some((shown) => shown.id === item.id)), ...current].slice(0, 2))
    } catch {
      // the Notifications page still lists the reminder
    }
  }, [])

  useEffect(() => {
    check()
    return subscribe('notifications', check)
  }, [check])

  async function acknowledge(item) {
    setPopups((current) => current.filter((popup) => popup.id !== item.id))
    try {
      await api.post(`/notifications/${item.id}/read`)
    } catch {
      // stays unread on the Notifications page
    }
  }

  if (!popups.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" role="region" aria-label="Return reminders">
      {popups.map((item) => {
        const urgent = item.kind === 'return_reminder_30m'
        const color = urgent ? 'var(--danger)' : 'var(--warning)'
        return (
          <article key={item.id} role="alert" className="card overflow-hidden shadow-2xl" style={{ border: `1px solid ${color}` }}>
            <header className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: urgent ? 'rgba(251,113,133,0.14)' : 'rgba(251,191,36,0.14)' }}>
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color }}>
                <AlarmClock size={16} /> {urgent ? '30 minutes left on your rental' : '2 hours left on your rental'}
              </p>
              <button onClick={() => acknowledge(item)} className="p-1" aria-label="Close reminder"><X size={16} /></button>
            </header>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm">{item.body}</p>
              <button onClick={() => acknowledge(item)} className="btn-primary px-3 py-2 text-sm">OK, got it</button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
