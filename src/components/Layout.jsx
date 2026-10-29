import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Car, CarFront, CalendarCheck, Bell, LogOut, RefreshCw, Settings, ChevronDown } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import ReturnReminderPopups from './ReturnReminderPopups'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { subscribe } from '../lib/realtime'
import { playChime, soundEnabled } from '../lib/sound'

// Last unread count seen for this account; kept outside the component so moving between pages doesn't chime again.
let lastUnread = { profileId: null, count: null }

export default function Layout({ children, bare = false }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!profile?.id) {
      setUnreadNotifications(0)
      return
    }

    let active = true
    async function loadUnreadNotifications() {
      try {
        const { count = 0 } = await api.get('/notifications/unread-count')
        if (!active) return
        setUnreadNotifications(count)
        // Chime when a new notification arrives (not for ones already there on sign-in).
        const previous = lastUnread.profileId === profile.id ? lastUnread.count : null
        if (previous !== null && count > previous && soundEnabled()) playChime()
        lastUnread = { profileId: profile.id, count }
      } catch (error) {
        console.error('Unable to load unread notification count:', error.message)
      }
    }

    loadUnreadNotifications()
    const unsubscribe = subscribe('notifications', loadUnreadNotifications)

    return () => {
      active = false
      unsubscribe()
    }
  }, [profile?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    // Full-height shell: the top bar and tabs stay in place; only the area below them scrolls.
    <div className="h-dvh flex flex-col app-shell overflow-hidden">
      <header className="customer-header galaxy-bg relative z-30 shrink-0 flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="flex items-center gap-2">
          <div className="pardz-logo w-8 h-8 rounded-lg flex items-center justify-center text-white" aria-label="Pardz Car Rental"><CarFront size={18} /></div>
          <div>
            <p className="font-display font-semibold leading-none text-sm">WheelSync</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pardz Car Rental</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block text-right leading-tight">
            <p className="text-sm font-semibold">{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{now.toLocaleTimeString()}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost p-2" aria-label="Refresh page" title="Refresh page"><RefreshCw size={16} /></button>
          {profile && <NavLink
            to="/notifications"
            className="btn-ghost p-2 relative"
            aria-label={unreadNotifications ? `Open notifications, ${unreadNotifications} unread` : 'Open notifications'}
            title={unreadNotifications ? `${unreadNotifications} unread notifications` : 'Notifications'}
          >
            <Bell size={16} />
            {unreadNotifications > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--danger)' }}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </NavLink>}
          <ThemeToggle />
          <button onClick={() => setMenuOpen((open) => !open)} className="btn-ghost p-2 sm:hidden" aria-label="Open navigation menu" aria-expanded={menuOpen}>
            <span className="block w-5 h-0.5 mb-1" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-0.5 mb-1" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-0.5" style={{ background: 'currentColor' }} />
          </button>
          {profile ? <div className="relative">
            <button onClick={() => setProfileMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-soft)' }} aria-label="Open account menu" aria-expanded={profileMenuOpen}>
              <div className="pardz-logo w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold">{profile?.full_name?.[0]?.toUpperCase() ?? 'C'}</div>
              <div className="hidden sm:block leading-tight text-left"><p className="text-sm font-semibold">{profile?.full_name?.split(' ')[0] ?? 'Customer'}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Customer</p></div>
              <ChevronDown size={15} />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 card p-2 z-50 shadow-xl">
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                  <p className="font-semibold">{profile?.full_name ?? 'Customer'}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
                </div>
                <button onClick={() => { setProfileMenuOpen(false); navigate('/settings') }} className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm btn-ghost mt-2"><Settings size={16} /> Settings</button>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm" style={{ color: 'var(--danger)' }}><LogOut size={16} /> Sign out</button>
              </div>
            )}
          </div> : <div className="flex items-center gap-2"><Link to="/login" className="btn-ghost px-3 py-2 text-sm">Sign in</Link><Link to="/signup" className="btn-primary px-3 py-2 text-sm">Create account</Link></div>}
        </div>
      </header>

      <nav className={`${menuOpen ? 'flex' : 'hidden'} sm:flex relative z-20 shrink-0 flex-col sm:flex-row gap-2 px-5 py-3 border-b`} style={{ borderColor: 'var(--border-soft)' }}>
        <NavLink to="/" end className={({ isActive }) => 'px-3 py-1.5 rounded-full text-sm font-medium'} style={({ isActive }) => ({ background: isActive ? 'var(--gradient-primary)' : 'var(--bg-surface-2)', color: isActive ? 'white' : 'var(--text-muted)' })}>
          <span className="flex items-center gap-1.5"><Car size={15} /> Browse vehicles</span>
        </NavLink>
        {profile && <NavLink to="/bookings" className={({ isActive }) => 'px-3 py-1.5 rounded-full text-sm font-medium'} style={({ isActive }) => ({ background: isActive ? 'var(--gradient-primary)' : 'var(--bg-surface-2)', color: isActive ? 'white' : 'var(--text-muted)' })}>
          <span className="flex items-center gap-1.5"><CalendarCheck size={15} /> My bookings</span>
        </NavLink>}
        {profile && <NavLink to="/notifications" className={({ isActive }) => 'px-3 py-1.5 rounded-full text-sm font-medium'} style={({ isActive }) => ({ background: isActive ? 'var(--gradient-primary)' : 'var(--bg-surface-2)', color: isActive ? 'white' : 'var(--text-muted)' })}>
          <span className="flex items-center gap-1.5"><Bell size={15} /> Notifications</span>
        </NavLink>}
        {profile && <span className="sm:ml-auto text-sm self-center" style={{ color: 'var(--text-muted)' }}>Hi, {profile.full_name?.split(' ')[0]}</span>}
      </nav>

      <div className="flex-1 min-h-0 mt-3 overflow-y-auto flex flex-col">
        <main className={bare ? 'flex flex-1 w-full min-w-0 min-h-0' : 'flex-1 p-5 max-w-5xl w-full mx-auto'}>{children}</main>
      </div>
      {profile?.id && <ReturnReminderPopups />}
    </div>
  )
}
