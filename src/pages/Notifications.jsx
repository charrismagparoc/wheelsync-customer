import { useEffect, useState } from 'react'
import { AlarmClock, Bell, CalendarCheck, CalendarPlus, CalendarX, CheckCheck, FileText } from 'lucide-react'
import { api } from '../lib/api'
import { subscribe } from '../lib/realtime'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const ACCEPTED_BOOKING_MESSAGE = 'Your booking requirements are approved and verified. Please visit Pardz Car Rental at Zone 7, Kauswagan Highway, Cagayan de Oro City. Submit one physical ID to our admin for vehicle release; it will be returned to you when the vehicle is returned.'

const TONES = {
  warning: { color: 'var(--warning)', background: 'rgba(251,191,36,0.14)' },
  danger: { color: 'var(--danger)', background: 'rgba(251,113,133,0.14)' },
  success: { color: 'var(--success)', background: 'rgba(74,222,128,0.14)' },
  info: { color: 'var(--nebula-3)', background: 'rgba(79,124,255,0.14)' },
  muted: { color: 'var(--text-muted)', background: 'var(--bg-surface-2)' },
}

// Matches Notification.kind from the API.
const KINDS = {
  return_reminder_2h: { label: 'Return in 2 hours', icon: AlarmClock, tone: 'warning', group: 'returns' },
  return_reminder_30m: { label: 'Return in 30 minutes', icon: AlarmClock, tone: 'danger', group: 'returns' },
  booking_accepted: { label: 'Accepted', icon: CalendarCheck, tone: 'success', group: 'bookings' },
  booking_rejected: { label: 'Rejected', icon: CalendarX, tone: 'danger', group: 'bookings' },
  booking_request: { label: 'Request sent', icon: CalendarPlus, tone: 'info', group: 'bookings' },
  booking_status: { label: 'Booking update', icon: CalendarCheck, tone: 'info', group: 'bookings' },
  requirements: { label: 'Requirements', icon: FileText, tone: 'warning', group: 'account' },
  general: { label: 'Update', icon: Bell, tone: 'muted', group: 'account' },
}

const TABS = [
  ['all', 'All'],
  ['bookings', 'Accepted and rejected'],
  ['returns', 'Return reminders'],
  ['account', 'Requirements and other'],
]

const kindOf = (item) => KINDS[item.kind] ?? KINDS.general

function notificationContent(item) {
  if (item.kind === 'booking_accepted') {
    return { title: 'Booking accepted: requirements approved', body: ACCEPTED_BOOKING_MESSAGE }
  }
  return { title: item.title, body: item.body }
}

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Notifications() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [error, setError] = useState('')

  async function load() {
    try {
      setItems(await api.get('/notifications'))
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    load()
    return subscribe('notifications', load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  async function markRead(item) {
    if (item.is_read) return
    try {
      await api.post(`/notifications/${item.id}/read`)
    } catch (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const visible = items.filter((item) => tab === 'all' || kindOf(item).group === tab)
  const unreadVisible = visible.filter((item) => !item.is_read)

  async function markAllRead() {
    await Promise.allSettled(unreadVisible.map((item) => api.post(`/notifications/${item.id}/read`)))
    load()
  }

  return (
    <Layout>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Notifications</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Booking decisions and return reminders from Pardz Car Rental.</p>
        </div>
        {unreadVisible.length > 0 && (
          <button onClick={markAllRead} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm"><CheckCheck size={15} /> Mark {unreadVisible.length} as read</button>
        )}
      </div>
      {error && <p role="alert" className="text-sm px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(251,113,133,0.12)', color: 'var(--danger)' }}>{error}</p>}

      <div className="flex gap-2 mb-5 flex-wrap" role="tablist">
        {TABS.map(([key, label]) => {
          const unread = items.filter((item) => !item.is_read && (key === 'all' || kindOf(item).group === key)).length
          return (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: tab === key ? 'var(--gradient-primary)' : 'var(--bg-surface-2)', color: tab === key ? 'white' : 'var(--text-muted)' }}
            >
              {label}
              {unread > 0 && <span className="rounded-full px-1.5 text-xs font-bold text-white" style={{ background: 'var(--danger)' }}>{unread}</span>}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3">
        {visible.map((item) => {
          const kind = kindOf(item)
          const Icon = kind.icon
          const tone = TONES[kind.tone]
          const content = notificationContent(item)
          return (
            <button key={item.id} onClick={() => markRead(item)} className="card p-4 text-left flex gap-4" style={{ borderColor: item.is_read ? 'var(--border-soft)' : tone.color }}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={tone}><Icon size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tone}>{kind.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{timeAgo(item.created_at)}</span>
                  {!item.is_read && <span className="badge badge-ongoing ml-auto">New</span>}
                </div>
                <p className="font-medium mt-1.5">{content.title}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{content.body}</p>
              </div>
            </button>
          )
        })}
        {visible.length === 0 && <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>No notifications here yet.</div>}
      </div>
    </Layout>
  )
}
