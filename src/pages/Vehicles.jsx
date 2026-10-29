import { useEffect, useRef, useState } from 'react'
import { CarFront, Check, Info, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { subscribe } from '../lib/realtime'
import AvailabilityCalendar, { carName, isFreeBetween } from '../components/AvailabilityCalendar'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import DatePicker from '../components/DatePicker'
import TimePicker from '../components/TimePicker'
import FieldGroup from '../components/FieldGroup'
import IdTypeSelect from '../components/IdTypeSelect'
import { OTHER_DESTINATION, useDestinations } from '../lib/destinations'

// The five booking steps: progress label, heading, one-line help, and the main button's text.
const BOOKING_STEPS = [
  { label: 'Dates', title: 'Choose your dates', hint: 'Pick when you will pick up and return the car.', next: 'Next: rental details' },
  { label: 'Rental', title: 'Rental details', hint: 'Times, service and where you are going.', next: 'Next: rental agreement' },
  { label: 'Agreement', title: 'Rental agreement', hint: 'Read the agreement, then confirm below.', next: 'Continue to requirements' },
  { label: 'Requirements', title: 'Customer requirements', hint: 'Pardz checks these before approving your booking.', next: 'Next: review' },
  { label: 'Review', title: 'Review and send', hint: 'Check your booking, then send the request to Pardz.', next: '' },
]

// Agreement page helpers: a filled-in value on an underline, a label + underlined value row, and
// "PARDZ CAR RENTAL" in bold wherever it appears (as on the printed form).
function Blank({ children }) {
  return <span className="agreement-ink inline-block min-w-[8rem] border-b border-current px-1 text-center">{children}</span>
}

function FormLine({ label, children, wide = false }) {
  return (
    <div className={`flex items-end gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="shrink-0">{label}:</span>
      <span className="agreement-ink flex-1 border-b border-current px-1 text-center">{children}</span>
    </div>
  )
}

function boldCompany(text) {
  if (!text) return text
  return text.split(/(PARDZ CAR RENTAL)/g).map((part, i) => (part === 'PARDZ CAR RENTAL' ? <b key={i}>{part}</b> : part))
}

function todayKey() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function Vehicles() {
  const destinations = useDestinations()
  const { profile, refreshProfile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [agreementTerms, setAgreementTerms] = useState(null)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [vehicleDetails, setVehicleDetails] = useState(null)
  const [search, setSearch] = useState('') // search box above the vehicles
  const [range, setRange] = useState({ from: '', to: '', car: '' }) // dates and preferred car searched on the availability calendar
  const [booking, setBooking] = useState(null) // vehicle being booked
  const [bookingStep, setBookingStep] = useState(1)
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '')
  const [otherDestination, setOtherDestination] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', pickup_time: '', return_time: '', pickup_location: '', destination_from: '', destination_to: '', notes: '', service_type: 'self_drive' })
  const [requirements, setRequirements] = useState({
    id_type: profile?.id_type ?? '',
    id_number: profile?.id_number ?? '',
    second_id_type: profile?.second_id_type ?? '',
    second_id_number: profile?.second_id_number ?? '',
    address: profile?.address ?? '',
  })
  const [requirementFiles, setRequirementFiles] = useState({ firstId: null, secondId: null, address: null, income: null, extra1: null, extra2: null })
  const [verification, setVerification] = useState({
    status: profile?.verification_status ?? 'unsubmitted',
    id_photo_path: profile?.id_photo_path,
    second_id_photo_path: profile?.second_id_photo_path,
    proof_of_address_path: profile?.proof_of_address_path,
    proof_of_income_path: profile?.proof_of_income_path,
  })
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const [ageError, setAgeError] = useState('')
  const [agreementMissing, setAgreementMissing] = useState(false) // tried to continue without ticking the agreement box
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [vehicleList, terms, reservations] = await Promise.all([
        api.get('/vehicles'),
        api.get('/public/rental-agreement'),
        profile ? api.get('/vehicles/unavailable-dates') : Promise.resolve([]),
      ])
      setLoadError('')
      setVehicles(vehicleList)
      setAgreementTerms(terms)
      setBlockedDates(reservations)
    } catch (vehicleError) {
      setVehicles([])
      setLoadError(`Unable to load vehicles: ${vehicleError.message}`)
    }
  }

  useEffect(() => {
    load()
    if (profile) return subscribe('bookings', load)
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    setAge(profile.age ? String(profile.age) : '')
    setRequirements({
      id_type: profile.id_type ?? '',
      id_number: profile.id_number ?? '',
      second_id_type: profile.second_id_type ?? '',
      second_id_number: profile.second_id_number ?? '',
      address: profile.address ?? '',
    })
    setVerification({
      status: profile.verification_status ?? 'unsubmitted',
      id_photo_path: profile.id_photo_path,
      second_id_photo_path: profile.second_id_photo_path,
      proof_of_address_path: profile.proof_of_address_path,
      proof_of_income_path: profile.proof_of_income_path,
    })
  }, [profile?.id])

  // startDate / endDate: the dates searched on the availability calendar (fill in the booking form).
  function openBooking(v, startDate = '', endDate = '') {
    setBooking(v)
    setBookingStep(1)
    setAgreementAccepted(false)
    setAgreementMissing(false)
    setForm({ start_date: startDate, end_date: endDate, pickup_time: '', return_time: '', pickup_location: '', destination_from: '', destination_to: '', notes: '', service_type: 'self_drive' })
    setOtherDestination(false)
    setRequirements({
      id_type: profile?.id_type ?? '',
      id_number: profile?.id_number ?? '',
      second_id_type: profile?.second_id_type ?? '',
      second_id_number: profile?.second_id_number ?? '',
      address: profile?.address ?? '',
    })
    setRequirementFiles({ firstId: null, secondId: null, address: null, income: null, extra1: null, extra2: null })
    setError('')
  }

  function estimateDays() {
    if (!form.start_date || !form.end_date) return 0
    const [startYear, startMonth, startDay] = form.start_date.split('-').map(Number)
    const [endYear, endMonth, endDay] = form.end_date.split('-').map(Number)
    const days = (Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) / 86400000
    return days >= 0 ? days + 1 : 0
  }

  function overlapsExistingBooking(startDate, endDate) {
    if (!booking || !startDate || !endDate) return false
    return blockedDates.some((reservation) => (
      reservation.vehicle_id === booking.id &&
      startDate <= reservation.end_date &&
      endDate >= reservation.start_date
    ))
  }

  function dateIsBlocked(date) {
    return overlapsExistingBooking(date, date)
  }

  function changeDate(field, value) {
    if (value && dateIsBlocked(value)) {
      setError('That date is unavailable because this vehicle is already rented or reserved.')
      setForm((current) => ({ ...current, [field]: '' }))
      return
    }
    setError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  function nextStep() {
    if (bookingStep === 1 && (!form.start_date || !form.end_date || estimateDays() <= 0)) {
      setError('Choose a valid start and end date before continuing.')
      return
    }
    if (bookingStep === 2 && (!form.pickup_time || !form.return_time || !form.destination_to.trim() || (form.service_type === 'pickup_dropoff' && !form.pickup_location.trim()))) {
      setError('Choose pickup and return times, enter where you are travelling from and to, and add the pickup / drop-off location if you chose that service.')
      return
    }
    if (bookingStep === 2 && form.start_date === form.end_date && form.return_time <= form.pickup_time) {
      setError('Return time must be after pickup time for a same-day rental.')
      return
    }
    if (bookingStep === 3 && !agreementAccepted) {
      setAgreementMissing(true) // shown right under the checkbox, next to the button
      setError('')
      return
    }
    if (bookingStep === 4) {
      const message = !String(age).trim() ? 'Please enter your age.' : !/^\d{1,3}$/.test(String(age).trim()) || Number(age) < 1 || Number(age) > 120 ? 'Please enter a valid age.' : ''
      setAgeError(message)
      if (message) return
    }
    if (bookingStep === 4 && verification.status !== 'verified') {
      const missingIdDetails = !requirements.id_type || !requirements.id_number || !requirements.second_id_type || !requirements.second_id_number || !requirements.address.trim()
      const missingDocuments = (!verification.id_photo_path && !requirementFiles.firstId)
        || (!verification.second_id_photo_path && !requirementFiles.secondId)
        || (!verification.proof_of_address_path && !requirementFiles.address)
        || (!verification.proof_of_income_path && !requirementFiles.income)
      if (missingIdDetails || missingDocuments) {
        setError('Add both ID details and upload the required documents before continuing.')
        return
      }
    }
    setError('')
    setBookingStep((step) => Math.min(5, step + 1))
  }

  async function submitBooking(e) {
    e.preventDefault()
    setError('')
    const days = estimateDays()
    if (days <= 0) return setError('End date must be after the start date.')
    if (overlapsExistingBooking(form.start_date, form.end_date)) {
      return setError('Those dates are unavailable because this vehicle is already rented or reserved.')
    }

    setBusy(true)
    try {
      await api.put('/me/age', { age: Number(age) })

      if (verification.status !== 'verified') {
        const payload = new FormData()
        payload.append('id_type', requirements.id_type.trim())
        payload.append('id_number', requirements.id_number.trim())
        payload.append('second_id_type', requirements.second_id_type.trim())
        payload.append('second_id_number', requirements.second_id_number.trim())
        payload.append('address', requirements.address.trim())
        if (requirementFiles.firstId) payload.append('first_id', requirementFiles.firstId)
        if (requirementFiles.secondId) payload.append('second_id', requirementFiles.secondId)
        if (requirementFiles.address) payload.append('proof_of_address', requirementFiles.address)
        if (requirementFiles.income) payload.append('proof_of_income', requirementFiles.income)
        if (requirementFiles.extra1) payload.append('extra_document_1', requirementFiles.extra1)
        if (requirementFiles.extra2) payload.append('extra_document_2', requirementFiles.extra2)
        const updated = await api.upload('/me/verification', payload)
        setVerification({
          status: updated.verification_status,
          id_photo_path: updated.id_photo_path,
          second_id_photo_path: updated.second_id_photo_path,
          proof_of_address_path: updated.proof_of_address_path,
          proof_of_income_path: updated.proof_of_income_path,
        })
      }

      await api.post('/bookings', {
        vehicle_id: booking.id,
        start_date: form.start_date,
        end_date: form.end_date,
        pickup_time: form.pickup_time,
        return_time: form.return_time,
        pickup_location: form.service_type === 'pickup_dropoff' ? form.pickup_location.trim() : null,
        notes: form.notes,
        service_type: form.service_type,
        destination_to: form.destination_to.trim(),
      })
      refreshProfile().catch(() => {})
      setBooking(null)
      setSuccess('Booking request and requirements sent! Track its status under "My bookings".')
      setTimeout(() => setSuccess(''), 4000)
    } catch (submitError) {
      setError(submitError.message)
    }
    setBusy(false)
  }

  const vehicleBlockedRanges = blockedDates
    .filter((reservation) => reservation.vehicle_id === booking?.id)

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shownVehicles = vehicles
    .filter((v) => words.every((w) => `${carName(v)} ${v.category ?? ''} ${v.description ?? ''}`.toLowerCase().includes(w)))
    .filter((v) => !range.car || carName(v) === range.car)
    .filter((v) => !range.from || isFreeBetween(v, blockedDates, range.from, range.to))

  return (
    <Layout bare>
      {/* Wide screens: the availability panel stays put and only the vehicles column scrolls.
          Phones/tablets: one scrolling page with the folding availability bar on top. */}
      <div className="flex w-full min-w-0 flex-col lg:flex-row lg:min-h-0 lg:overflow-hidden">
      <aside className="shrink-0 px-4 pt-1 sm:px-6 sm:pt-3 lg:w-[380px] lg:pb-6 lg:pr-0 xl:w-[420px] lg:overflow-hidden">
        <div className="card p-4 sm:p-5 lg:max-h-full lg:overflow-y-auto">
          <AvailabilityCalendar vehicles={vehicles} blockedDates={blockedDates} signedIn={Boolean(profile)} range={range} onRangeChange={setRange} />
        </div>
      </aside>
      <section className="min-w-0 flex-1 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-3 lg:pb-0 lg:flex lg:min-h-0 lg:flex-col">
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:pb-6">
      <h1 className="font-display text-2xl font-semibold mb-1">Available vehicles</h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pick a ride and send a booking request to Pardz Car Rental.</p>
      <p className="mt-3 mb-6 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-bold" role="note" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--text-primary, inherit)' }}>
        <Info size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--nebula-3)' }} aria-hidden="true" />
        Vehicle photos are for reference only and may not show the actual unit you will rent. You will see the actual vehicle when you visit Pardz Car Rental.
      </p>

      {success && (
        <p className="text-sm px-4 py-3 rounded-xl mb-5" style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--success)' }}>{success}</p>
      )}
      {loadError && <p className="text-sm px-4 py-3 rounded-xl mb-5" role="alert" style={{ background: 'rgba(251,113,133,0.12)', color: 'var(--danger)' }}>{loadError}</p>}

      <div className="relative mb-4">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicles, e.g. Innova or Vios"
          aria-label="Search vehicles"
          className="w-full py-2.5 pl-10 pr-3"
        />
      </div>
      {(range.from || range.car) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.35)' }}>
          <span>
            Showing <b>{shownVehicles.length}</b> {range.car || (shownVehicles.length === 1 ? 'car' : 'cars')}
            {range.from && <>
              {' '}free {range.to && range.to !== range.from ? 'from' : 'on'}{' '}
              <b>{new Date(`${range.from}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</b>
              {range.to && range.to !== range.from && <> to <b>{new Date(`${range.to}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</b></>}
            </>}
          </span>
          <button onClick={() => setRange({ from: '', to: '', car: '' })} className="btn-ghost ml-auto px-3 py-1 text-xs">Show all cars</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {shownVehicles.map((v) => {
          const name = `${v.make} ${v.model}`.trim()
          return (
            <article key={v.id} className="vehicle-card flex flex-col p-5">
              <div className="relative z-[1] flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span style={{ color: 'var(--nebula-3)' }}>Pardz Car Rental</span>
                <span className="rounded-full px-2.5 py-1 normal-case tracking-normal" style={{ background: 'rgba(74,222,128,0.14)', color: 'var(--success)' }}>Available</span>
              </div>
              {v.image_url
                ? <div className="vehicle-card-photo mb-4 mt-3"><img src={v.image_url} alt={name} loading="lazy" /></div>
                : (
                  <div className="vehicle-card-stage my-2">
                    <CarFront size={84} strokeWidth={1.1} className="relative z-[1]" style={{ color: 'var(--nebula-3)', filter: 'drop-shadow(0 10px 16px rgba(2,6,23,0.6))' }} aria-label={name} />
                  </div>
                )}
              <h2 className="relative z-[1] font-display text-2xl font-semibold tracking-tight">{name}</h2>
              <div className="relative z-[1] mt-2 flex flex-wrap gap-x-5 gap-y-1">
                <span className="vehicle-card-spec">Status<b>Ready to book</b></span>
                <span className="vehicle-card-spec">Options<b>Self-drive · With driver</b></span>
              </div>
              {v.description && <p className="relative z-[1] mt-3 text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{v.description}</p>}
              <div className="relative z-[1] mt-auto flex items-center gap-2 pt-5">
                {profile
                  ? <button onClick={() => openBooking(v, range.from, range.to)} className="btn-primary flex-1 rounded-full py-2.5 text-sm">Book now</button>
                  : <Link to="/login" className="btn-primary flex-1 rounded-full py-2.5 text-center text-sm">Sign in to book</Link>}
                <button onClick={() => setVehicleDetails(v)} className="btn-ghost grid h-11 w-11 shrink-0 place-items-center rounded-full p-0" title="More details" aria-label={`More details about ${name}`}><Info size={18} /></button>
              </div>
            </article>
          )
        })}
        {shownVehicles.length === 0 && (
          <div className="card p-8 text-center col-span-full" style={{ color: 'var(--text-muted)' }}>
            {search.trim() ? `No vehicles match "${search.trim()}".` : range.from ? `No ${range.car || 'cars'} free for all of these dates. Try other dates${range.car ? ' or another car' : ''}.` : 'No vehicles available right now — check back soon.'}
          </div>
        )}
      </div>
      </div>
      </section>
      </div>

      {vehicleDetails && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-5" onClick={() => setVehicleDetails(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="vehicle-details-title" className="vehicle-card my-4 w-full max-w-2xl p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="relative z-[1] flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--nebula-3)' }}>Pardz Car Rental</p>
                <h2 id="vehicle-details-title" className="mt-1 font-display text-3xl font-semibold tracking-tight">{`${vehicleDetails.make} ${vehicleDetails.model}`.trim()}</h2>
              </div>
              <button onClick={() => setVehicleDetails(null)} className="btn-ghost grid h-10 w-10 place-items-center rounded-full p-0" aria-label="Close vehicle details"><X size={18} /></button>
            </div>
            {vehicleDetails.image_url
              ? <div className="vehicle-card-photo my-4"><img src={vehicleDetails.image_url} alt={`${vehicleDetails.make} ${vehicleDetails.model}`.trim()} /></div>
              : (
                <div className="vehicle-card-stage my-3" style={{ height: '14rem' }}>
                  <CarFront size={110} strokeWidth={1.1} className="relative z-[1]" style={{ color: 'var(--nebula-3)', filter: 'drop-shadow(0 10px 16px rgba(2,6,23,0.6))' }} aria-hidden="true" />
                </div>
              )}
            <div className="relative z-[1] flex flex-wrap gap-x-6 gap-y-1">
              <span className="vehicle-card-spec">Status<b>Available to request</b></span>
              <span className="vehicle-card-spec">Options<b>Self-drive · With driver · Pickup / drop-off</b></span>
            </div>
            <div className="relative z-[1] mt-4 rounded-2xl p-4 text-sm" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(96, 165, 250, 0.18)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--nebula-3)' }}>About this vehicle</p>
              <p className="mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{vehicleDetails.description || 'Contact Pardz Car Rental for vehicle details.'}</p>
            </div>
            <div className="relative z-[1] mt-5 flex justify-end gap-2">
              <button onClick={() => setVehicleDetails(null)} className="btn-ghost rounded-full px-5 py-2.5 text-sm">Close</button>
              {profile ? <button onClick={() => { const vehicle = vehicleDetails; setVehicleDetails(null); openBooking(vehicle) }} className="btn-primary rounded-full px-6 py-2.5 text-sm">Book now</button> : <Link to="/login" className="btn-primary rounded-full px-6 py-2.5 text-sm">Sign in to book</Link>}
            </div>
          </section>
        </div>
      )}

      {booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6">
          <div className="card flex w-full max-w-2xl flex-col overflow-hidden max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]">
            {/* Header: car, close button and the step progress (stays in place) */}
            <div className="shrink-0 px-5 pt-5 pb-4 sm:px-7 sm:pt-6" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--nebula-3)' }}>Booking request</p>
                  <h2 className="font-display text-xl font-semibold">{booking.make} {booking.model}</h2>
                </div>
                <button type="button" onClick={() => setBooking(null)} className="btn-ghost p-2" aria-label="Close"><X size={18} /></button>
              </div>
              <ol className="mt-5 flex items-start" aria-label="Booking steps">
                {BOOKING_STEPS.map((step, index) => {
                  const number = index + 1
                  const done = number < bookingStep
                  const current = number === bookingStep
                  return (
                    <li key={step.label} className="flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
                      <div className="flex w-full items-center">
                        <span className="h-0.5 flex-1" style={{ background: index === 0 ? 'transparent' : number <= bookingStep ? 'var(--nebula-3)' : 'var(--border-soft)' }} />
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
                          style={{
                            background: done || current ? 'var(--gradient-primary)' : 'var(--bg-surface-2)',
                            color: done || current ? 'white' : 'var(--text-muted)',
                            boxShadow: current ? '0 0 0 3px var(--bg-surface), 0 0 0 5px var(--nebula-3)' : undefined,
                          }}
                        >
                          {done ? <Check size={15} strokeWidth={3} /> : number}
                        </span>
                        <span className="h-0.5 flex-1" style={{ background: index === BOOKING_STEPS.length - 1 ? 'transparent' : number < bookingStep ? 'var(--nebula-3)' : 'var(--border-soft)' }} />
                      </div>
                      <span className={`text-[11px] sm:text-xs ${current ? 'block' : 'hidden sm:block'}`} style={{ color: current ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: current ? 600 : 400 }}>{step.label}</span>
                    </li>
                  )
                })}
              </ol>
            </div>

            <form onSubmit={submitBooking} className="flex min-h-0 flex-1 flex-col">
              {/* Body: the current step (scrolls when long) */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <div className="mb-5">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Step {bookingStep} of {BOOKING_STEPS.length}</p>
                  <h3 className="font-display text-lg font-semibold">{BOOKING_STEPS[bookingStep - 1].title}</h3>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{BOOKING_STEPS[bookingStep - 1].hint}</p>
                </div>

                {error && <p ref={errorRef} role="alert" className="mb-5 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(251,113,133,0.12)', color: 'var(--danger)' }}>{error}</p>}

                {bookingStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DatePicker label="Start date" value={form.start_date} minDate={todayKey()} blockedRanges={vehicleBlockedRanges} onChange={(value) => changeDate('start_date', value)} />
                      <DatePicker label="End date" value={form.end_date} minDate={form.start_date || todayKey()} blockedRanges={vehicleBlockedRanges} onChange={(value) => changeDate('end_date', value)} />
                    </div>
                    {form.start_date && form.end_date && estimateDays() > 0 && (
                      <p className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--bg-surface-2)' }}>
                        <b>{estimateDays()}</b> rental day(s): {form.start_date} to {form.end_date}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Only accepted or ongoing bookings block dates for this vehicle. Pending requests do not reserve it yet.</p>
                  </div>
                )}

                {bookingStep === 2 && (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TimePicker label="Pickup time" value={form.pickup_time} onChange={(value) => setForm((current) => ({ ...current, pickup_time: value }))} />
                      <TimePicker label="Return time" value={form.return_time} onChange={(value) => setForm((current) => ({ ...current, return_time: value }))} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-sm">Service type
                        <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value, pickup_location: e.target.value === 'pickup_dropoff' ? form.pickup_location : '' })} className="px-3 py-2.5">
                          <option value="self_drive">Self-drive</option>
                          <option value="with_driver">With driver</option>
                          <option value="pickup_dropoff">Pickup / drop-off service</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">Destination
                        <select required className="px-3 py-2.5" value={otherDestination ? OTHER_DESTINATION : form.destination_to} onChange={(e) => {
                          const other = e.target.value === OTHER_DESTINATION
                          setOtherDestination(other)
                          setForm({ ...form, destination_to: other ? '' : e.target.value })
                        }}>
                          <option value="">Choose destination</option>
                          {destinations.map((place) => <option key={place} value={place}>{place}</option>)}
                          <option value={OTHER_DESTINATION}>Custom destination</option>
                        </select>
                      </label>
                    </div>
                    {otherDestination && <label className="flex flex-col gap-1.5 text-sm">Custom destination<input required autoFocus maxLength={200} className="px-3 py-2.5" placeholder="Type your destination, e.g. Bukidnon" value={form.destination_to} onChange={(e) => setForm({ ...form, destination_to: e.target.value })} /></label>}
                    {form.service_type === 'pickup_dropoff' && <label className="flex flex-col gap-1.5 text-sm">Where should we pick up / drop off the car?<input required className="px-3 py-2.5" placeholder="e.g. Cagayan de Oro airport" value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} /></label>}
                  </div>
                )}

                {bookingStep === 3 && (
                  <div className="flex flex-col gap-6">
                    {/* Laid out like Pardz's printed rental agreement: white page, underlined filled-in values. */}
                    <section className="agreement-paper rounded-lg px-5 py-7 text-[13px] leading-6 sm:px-9 sm:py-9">
                      <h4 className="text-center text-xl font-bold tracking-wide">{(agreementTerms?.title || 'Rental Agreement').toUpperCase()}</h4>
                      <p className="mt-6 font-bold">{agreementTerms?.preamble}</p>
                      <p className="mt-3 text-justify">
                        This agreement is between <Blank>{profile?.full_name}</Blank>, resident of{' '}
                        <Blank>{profile?.address || 'address to be entered in requirements'}</Blank> and holder of the customer's submitted ID,
                        hereunder called the <b>RENTER</b>, and <b>PARDZ CAR RENTAL</b>, hereunder called the <b>LESSOR</b>.
                      </p>
                      <h5 className="mt-6 text-center font-bold">{agreementTerms?.witnesseth}</h5>
                      <p className="mt-3">{agreementTerms?.vehicle_details_intro}</p>
                      <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        <FormLine label="Vehicle">{booking.make} {booking.model}</FormLine>
                        <FormLine label="Service"><span className="capitalize">{form.service_type.replaceAll('_', ' ')}</span></FormLine>
                        <FormLine label="Period" wide>{form.start_date} to {form.end_date} · {estimateDays()} day(s)</FormLine>
                        <FormLine label="Release">{form.start_date} {form.pickup_time}</FormLine>
                        <FormLine label="Return">{form.end_date} {form.return_time}</FormLine>
                        <FormLine label="Destination">{form.destination_to}</FormLine>
                        {form.pickup_location && <FormLine label="Pickup / drop-off">{form.pickup_location}</FormLine>}
                      </div>
                      <p className="mt-6">The Renter agrees:</p>
                      <ol className="mt-2 flex flex-col gap-1.5 pl-6">
                        {(agreementTerms?.renter_terms || []).map((term, index) => (
                          <li key={index} className="grid grid-cols-[1.75rem_1fr]">
                            <span>{index + 1}.)</span>
                            <span className="text-justify">{boldCompany(term.replace('{period}', `${form.start_date} to ${form.end_date} (${estimateDays()} day(s))`).replace('{amount}', 'the agreed rental amount'))}</span>
                          </li>
                        ))}
                      </ol>
                      <h5 className="mx-auto mt-7 max-w-xs text-center font-bold uppercase">{agreementTerms?.liability_heading}</h5>
                      <p className="mt-3 text-justify">{boldCompany(agreementTerms?.liability_text?.replace(/\s+/g, ' ').trim())}</p>
                      <p className="mt-6 text-center text-xs" style={{ color: 'var(--agreement-note)' }}>Signatures will be collected on the printed agreement.</p>
                    </section>
                    <label
                      className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm font-normal leading-6"
                      style={{ border: `1px solid ${agreementMissing && !agreementAccepted ? 'var(--danger)' : 'var(--border-soft)'}`, background: agreementMissing && !agreementAccepted ? 'rgba(251,113,133,0.08)' : 'var(--bg-surface-2)' }}
                    >
                      <input
                        type="checkbox"
                        checked={agreementAccepted}
                        onChange={(event) => { setAgreementAccepted(event.target.checked); if (event.target.checked) { setAgreementMissing(false); setError('') } }}
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-invalid={agreementMissing && !agreementAccepted}
                      />
                      <span>I have read and agree to the rental agreement.</span>
                    </label>
                    {agreementMissing && !agreementAccepted && (
                      <p role="alert" className="-mt-3 text-sm" style={{ color: 'var(--danger)' }}>
                        Please confirm that you have read the rental agreement to continue.
                      </p>
                    )}
                  </div>
                )}

                {bookingStep === 4 && (
                  <div className="flex flex-col gap-6">
                    <FieldGroup title="Your details">
                      <label className="flex flex-col gap-1.5 text-sm">Age
                        <input
                          inputMode="numeric"
                          maxLength={3}
                          value={age}
                          onChange={(e) => { setAge(e.target.value.replace(/\D/g, '')); setAgeError('') }}
                          aria-invalid={Boolean(ageError)}
                          className="px-3 py-2.5"
                          style={ageError ? { borderColor: 'var(--danger)' } : undefined}
                          placeholder="Enter your age"
                        />
                        {ageError && <span role="alert" className="text-xs font-normal" style={{ color: 'var(--danger)' }}>{ageError}</span>}
                      </label>
                      {verification.status !== 'verified' && <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">Home / mailing address<input required maxLength={500} value={requirements.address} onChange={(e) => setRequirements({ ...requirements, address: e.target.value })} className="px-3 py-2.5" /></label>}
                    </FieldGroup>
                    {verification.status === 'verified' ? (
                      <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--success)' }}>Your customer documents are verified. No additional requirements are needed.</p>
                    ) : <>
                      {profile?.verification_notes && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(251,113,133,0.12)', color: 'var(--danger)' }}>Admin note: {profile.verification_notes}</p>}
                      <FieldGroup title="First ID">
                        <IdTypeSelect label="ID type" value={requirements.id_type} onChange={(v) => setRequirements((r) => ({ ...r, id_type: v }))} />
                        <label className="flex flex-col gap-1.5 text-sm">ID number<input required value={requirements.id_number} onChange={(e) => setRequirements({ ...requirements, id_number: e.target.value })} className="px-3 py-2.5" /></label>
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">ID photo<input required={!verification.id_photo_path} type="file" accept="image/*" onChange={(e) => setRequirementFiles({ ...requirementFiles, firstId: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                      </FieldGroup>
                      <FieldGroup title="Second ID">
                        <IdTypeSelect label="ID type" value={requirements.second_id_type} onChange={(v) => setRequirements((r) => ({ ...r, second_id_type: v }))} />
                        <label className="flex flex-col gap-1.5 text-sm">ID number<input required value={requirements.second_id_number} onChange={(e) => setRequirements({ ...requirements, second_id_number: e.target.value })} className="px-3 py-2.5" /></label>
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">ID photo<input required={!verification.second_id_photo_path} type="file" accept="image/*" onChange={(e) => setRequirementFiles({ ...requirementFiles, secondId: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                      </FieldGroup>
                      <FieldGroup title="Documents">
                        <label className="flex flex-col gap-1.5 text-sm">Proof of address<input required={!verification.proof_of_address_path} type="file" accept="image/*,.pdf" onChange={(e) => setRequirementFiles({ ...requirementFiles, address: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                        <label className="flex flex-col gap-1.5 text-sm">Proof of income<input required={!verification.proof_of_income_path} type="file" accept="image/*,.pdf" onChange={(e) => setRequirementFiles({ ...requirementFiles, income: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                      </FieldGroup>
                      <FieldGroup title="Optional">
                        <label className="flex flex-col gap-1.5 text-sm">Additional photo 1<input type="file" accept="image/*" onChange={(e) => setRequirementFiles({ ...requirementFiles, extra1: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                        <label className="flex flex-col gap-1.5 text-sm">Additional photo 2<input type="file" accept="image/*" onChange={(e) => setRequirementFiles({ ...requirementFiles, extra2: e.target.files?.[0] ?? null })} className="px-3 py-2" /></label>
                      </FieldGroup>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current verification status: {verification.status}</p>
                    </>}
                  </div>
                )}

                {bookingStep === 5 && (
                  <div className="flex flex-col gap-5">
                    <dl className="grid gap-x-6 gap-y-3 rounded-xl p-5 text-sm sm:grid-cols-2" style={{ background: 'var(--bg-surface-2)' }}>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Vehicle</dt><dd className="font-medium">{booking.make} {booking.model}</dd></div>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Rental days</dt><dd className="font-medium">{estimateDays()} day(s)</dd></div>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Release</dt><dd className="font-medium">{form.start_date} {form.pickup_time}</dd></div>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Return</dt><dd className="font-medium">{form.end_date} {form.return_time}</dd></div>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Service</dt><dd className="font-medium capitalize">{form.service_type.replaceAll('_', ' ')}</dd></div>
                      <div><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Destination</dt><dd className="font-medium">{form.destination_to}</dd></div>
                      {form.service_type === 'pickup_dropoff' && <div className="sm:col-span-2"><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Pickup / drop-off</dt><dd className="font-medium">{form.pickup_location}</dd></div>}
                      <div className="sm:col-span-2"><dt className="text-xs" style={{ color: 'var(--text-muted)' }}>Customer requirements</dt><dd className="font-medium">{verification.status === 'verified' ? 'Already verified' : 'Submitted for review with this booking'}</dd></div>
                    </dl>
                    <label className="flex flex-col gap-1.5 text-sm">Notes (optional)<textarea rows={3} className="px-3 py-2.5" placeholder="Anything Pardz should know" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                  </div>
                )}
              </div>

              {/* Footer: Back and the next action (always visible) */}
              <div className="flex shrink-0 gap-3 px-5 py-4 sm:px-7" style={{ borderTop: '1px solid var(--border-soft)' }}>
                {bookingStep === 1
                  ? <button type="button" onClick={() => setBooking(null)} className="btn-ghost flex-1 py-2.5">Cancel</button>
                  : <button type="button" onClick={() => { setError(''); setBookingStep(bookingStep - 1) }} className="btn-ghost flex-1 py-2.5">Back</button>}
                {bookingStep < 5
                  ? <button type="button" onClick={nextStep} disabled={bookingStep === 1 && overlapsExistingBooking(form.start_date, form.end_date)} className="btn-primary flex-[2] py-2.5">{BOOKING_STEPS[bookingStep - 1].next}</button>
                  : <button type="submit" disabled={busy || overlapsExistingBooking(form.start_date, form.end_date)} className="btn-primary flex-[2] py-2.5">{busy ? 'Sending…' : 'Send booking request'}</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
