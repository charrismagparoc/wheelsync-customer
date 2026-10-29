import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'

// Quick availability search for customers. Pick a From / To range (date boxes or two clicks on the calendar);
// the page then shows only the cars free for every day of it (and of the preferred model, if chosen).
// Day borders: green = cars free that day, red = every car is booked. Only dates are shown, never who booked.
// `blockedDates` = [{ vehicle_id, start_date, end_date }] from the API; the page reloads it live.
const COLORS = {
  free: { border: 'rgb(34,197,94)', fill: 'rgba(34,197,94,0.12)' },
  booked: { border: 'rgb(239,68,68)', fill: 'rgba(239,68,68,0.18)' },
}
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const nice = (key) => new Date(`${key}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const monthOf = (key) => { const d = new Date(`${key}T00:00`); return new Date(d.getFullYear(), d.getMonth(), 1) }

export const carName = (v) => `${v.make} ${v.model}`.trim()

// True when the vehicle has no booking on any day from `from` to `to` (inclusive).
export function isFreeBetween(vehicle, blockedDates, from, to) {
  const end = to || from
  return !blockedDates.some((b) => b.vehicle_id === vehicle.id && b.start_date <= end && b.end_date >= from)
}

export default function AvailabilityCalendar({ vehicles, blockedDates, signedIn, range, onRangeChange }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  // Phones and tablets: folded by default so the cars stay near the top. Wide screens: always open.
  const [open, setOpen] = useState(false)

  const today = iso(new Date())
  const { from, to, car } = range
  // The preferred car narrows everything below (counts, colours, list) to that model.
  const models = [...new Set(vehicles.map(carName))].sort((a, b) => a.localeCompare(b))
  const pool = car ? vehicles.filter((v) => carName(v) === car) : vehicles
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))
  const freeOn = (key) => pool.filter((v) => isFreeBetween(v, blockedDates, key, key)).length
  const inRange = (key) => from && key >= from && key <= (to || from)
  const freeCars = from ? pool.filter((v) => isFreeBetween(v, blockedDates, from, to)) : []

  // Calendar clicks build the range: first click = From, second (same day or later) = To.
  function pickDay(key) {
    if (key < today) return
    if (!from || to || key < from) onRangeChange({ ...range, from: key, to: '' })
    else onRangeChange({ ...range, to: key })
  }

  function setFrom(value) {
    onRangeChange({ ...range, from: value, to: to && value && to < value ? '' : to })
    if (value) setMonth(monthOf(value))
  }

  return (
    <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left lg:cursor-default"
      >
        <span>
          <span className="font-semibold flex items-center gap-2"><CalendarDays size={18} /> Availability</span>
          <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose your dates to see the free cars.</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`${open ? 'block' : 'hidden'} mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col`}>
      {!signedIn ? (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>Sign in to see which days the vehicles are free.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <label className="flex min-w-0 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>From
              <input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="w-full min-w-0 px-2 py-2 text-xs" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>To
              <input type="date" min={from || today} value={to} onChange={(e) => onRangeChange({ ...range, from: from || e.target.value, to: e.target.value })} className="w-full min-w-0 px-2 py-2 text-xs" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>Car
              <select value={car} onChange={(e) => onRangeChange({ ...range, car: e.target.value })} className="w-full min-w-0 px-2 py-2 text-xs" aria-label="Preferred car">
                <option value="">Any car</option>
                {models.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between mb-2">
            <button type="button" className="btn-ghost p-1.5" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={15} /></button>
            <strong className="text-sm">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
            <button type="button" className="btn-ghost p-1.5" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={15} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            {DAY_NAMES.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: days[0].getDay() }, (_, i) => <span key={`blank-${i}`} />)}
            {days.map((day) => {
              const key = iso(day)
              const past = key < today
              const free = freeOn(key)
              const color = COLORS[pool.length && free === 0 ? 'booked' : 'free']
              const picked = inRange(key)
              return (
                <button
                  key={key}
                  type="button"
                  disabled={past}
                  onClick={() => pickDay(key)}
                  title={past ? 'Past date' : `${free} of ${pool.length} ${car || 'cars'} free`}
                  className="flex aspect-square max-h-14 w-full flex-col items-center justify-center rounded-full text-xs sm:text-sm disabled:cursor-not-allowed"
                  style={{
                    border: `2px solid ${past ? 'var(--border-soft)' : color.border}`,
                    background: picked ? color.border : past ? 'transparent' : color.fill,
                    color: picked ? 'white' : 'var(--text-primary)',
                    opacity: past ? 0.4 : 1,
                    fontWeight: key === today || key === from || key === to ? 700 : 500,
                  }}
                >
                  {day.getDate()}
                  {!past && <span className="text-[9px] leading-3 font-normal opacity-80">{free} free</span>}
                </button>
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded" style={{ border: `2px solid ${COLORS.free.border}` }} />Cars free</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded" style={{ border: `2px solid ${COLORS.booked.border}` }} />Rented</span>
          </div>

          {/* Summary only: the free cars themselves are shown (and booked) in the vehicles grid. */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
            {!from ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pick your From and To dates (or tap two days on the calendar){car ? ` to see which ${car} units are free.` : ', and the car you prefer, to see which cars are free.'}</p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">
                  {to && to !== from ? `${nice(from)} – ${nice(to)}` : nice(from)} · {freeCars.length} {car || (freeCars.length === 1 ? 'car' : 'cars')} free
                </p>
                <button type="button" onClick={() => onRangeChange({ from: '', to: '', car: '' })} className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"><X size={12} /> Clear</button>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  )
}
