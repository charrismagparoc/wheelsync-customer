import { useRef, useState } from 'react'

// Scroll-wheel time picker (like a phone's): hour, minutes and AM/PM columns with the choice on the centre row.
//   value    - "HH:MM" in 24-hour time, or '' when nothing is chosen yet (wheel shows 9:00 AM, greyed out)
//   onChange - receives the new "HH:MM"
// Mouse wheel / swipe a column, tap a value, or use the up/down keys. The column's position always comes
// from the selected value, so the three columns stay lined up on the same row.
const ROW = 36 // height of one row in px; every column uses the same rows
const VISIBLE = 5 // rows shown; the middle one is the selected value
const START = '09:00'
const pad = (n) => String(n).padStart(2, '0')

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: pad(i) }))
const PERIODS = [{ value: false, label: 'AM' }, { value: true, label: 'PM' }]

function parts(value) {
  const [h, m] = (value || START).split(':').map(Number)
  return { hour12: h % 12 || 12, minute: m, pm: h >= 12 }
}

function build(hour12, minute, pm) {
  return `${pad((hour12 % 12) + (pm ? 12 : 0))}:${pad(minute)}`
}

// One column. `index` is the selected row; `drag` is the live finger offset while swiping.
function Wheel({ label, items, index, unit, active, onPick }) {
  const [drag, setDrag] = useState(0)
  const touch = useRef(null)
  const wheelBudget = useRef(0)
  const clamp = (i) => Math.max(0, Math.min(items.length - 1, i))
  const pick = (i) => onPick(clamp(i))

  function onWheel(e) {
    // One row per notch of the mouse wheel / trackpad swipe.
    wheelBudget.current += e.deltaY
    if (Math.abs(wheelBudget.current) >= 40) {
      pick(index + Math.sign(wheelBudget.current))
      wheelBudget.current = 0
    }
  }

  const offset = (Math.floor(VISIBLE / 2) - index) * ROW + drag

  return (
    <div
      role="listbox"
      tabIndex={0}
      aria-label={label}
      onWheel={onWheel}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); pick(index - 1) }
        if (e.key === 'ArrowDown') { e.preventDefault(); pick(index + 1) }
      }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientY }}
      onTouchMove={(e) => { if (touch.current != null) setDrag(e.touches[0].clientY - touch.current) }}
      onTouchEnd={() => { if (touch.current != null) { pick(index - Math.round(drag / ROW)); setDrag(0); touch.current = null } }}
      className="relative z-[1] w-16 overflow-hidden outline-none touch-none select-none"
      style={{
        height: ROW * VISIBLE,
        maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
      }}
    >
      <div style={{ transform: `translateY(${offset}px)`, transition: drag ? 'none' : 'transform 0.18s ease-out' }}>
        {items.map((item, i) => {
          const selected = i === index
          return (
            <div
              key={item.label}
              role="option"
              aria-selected={selected}
              onClick={() => pick(i)}
              className="flex cursor-pointer items-center justify-center tabular-nums"
              style={{
                height: ROW,
                fontSize: selected ? 20 : 16,
                fontWeight: selected ? 600 : 400,
                color: selected && active ? 'var(--nebula-3)' : 'var(--text-muted)',
                opacity: selected ? 1 : Math.max(0.3, 1 - Math.abs(i - index) * 0.3),
              }}
            >
              {item.label}
              {selected && unit && <span className="ml-1 text-[11px] font-medium">{unit}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimePicker({ label, value, onChange }) {
  const active = Boolean(value)
  const { hour12, minute, pm } = parts(value)

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span>{label}{!active && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>· scroll or tap to choose</span>}</span>
      <div className="relative flex items-center justify-center gap-2 rounded-xl px-2" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-soft)' }} role="group" aria-label={label}>
        {/* Selected row: thin lines across all three columns */}
        <div className="pointer-events-none absolute inset-x-3" style={{ top: '50%', height: ROW, marginTop: -ROW / 2, borderBlock: '1px solid var(--border-soft)' }} />
        <Wheel label={`${label} hour`} items={HOURS} index={hour12 - 1} unit="H" active={active} onPick={(i) => onChange(build(HOURS[i].value, minute, pm))} />
        <Wheel label={`${label} minutes`} items={MINUTES} index={minute} unit="M" active={active} onPick={(i) => onChange(build(hour12, MINUTES[i].value, pm))} />
        <Wheel label={`${label} AM or PM`} items={PERIODS} index={pm ? 1 : 0} active={active} onPick={(i) => onChange(build(hour12, minute, PERIODS[i].value))} />
      </div>
    </div>
  )
}
