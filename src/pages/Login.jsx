import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CarFront } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import heroImage from '../assets/hero.png'
import PasswordInput from '../components/PasswordInput'
import { api } from '../lib/api'

export default function Login() {
  const { signInWithPassword, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState(location.state?.notice || '')
  // Activation by the 6-digit code from the email (works on any device, even when the link can't be opened).
  const [codeOpen, setCodeOpen] = useState(Boolean(location.state?.activate))
  const [code, setCode] = useState('')
  const [activating, setActivating] = useState(false)

  async function handleActivate(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setActivating(true)
    try {
      const data = await api.post('/auth/verify-code', { email: email.trim().toLowerCase(), code: code.trim() })
      setNotice(data.detail)
      setCodeOpen(false)
      setCode('')
    } catch (activateError) {
      setError(activateError.message)
    }
    setActivating(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signInWithPassword(email, password)
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  async function handleResend() {
    setError('')
    setNotice('')
    setResending(true)
    const { error } = await resendVerification(email)
    setResending(false)
    if (error) return setError(error.message)
    setNotice('If this account needs activation, a new activation email has been sent. Open it and click Activate my account.')
  }

  return (
    <div className="min-h-screen galaxy-bg login-shell flex flex-col items-center justify-center p-6">
      <div className="absolute top-5 right-5"><ThemeToggle /></div>
      <div className="login-layout w-full max-w-6xl">
        <div className="login-brand-panel" style={{ backgroundImage: `url('/pardz-banner.png'), url(${heroImage})` }} aria-label="Pardz Car Rental" />
        <div className="w-full max-w-sm login-form-column">
        <div className="text-center mb-8">
          <div className="pardz-logo w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white mb-4" aria-label="Pardz Car Rental"><CarFront size={30} strokeWidth={2.2} /></div>
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sign in to book your next ride with Pardz Car Rental.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(251,113,133,0.12)', color: 'var(--danger)' }}>{error}</p>}
          <label className="flex flex-col gap-1 text-sm">Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-2.5" placeholder="you@email.com" />
          </label>
          <label className="flex flex-col gap-1 text-sm">Password
            <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-2.5" placeholder="••••••••" />
          </label>
          <button type="submit" disabled={busy} className="pardz-signin btn-primary py-2.5 mt-2">{busy ? 'Signing in…' : 'Sign in'}</button>
          {notice && <p className="text-sm" role="status" style={{ color: 'var(--success)' }}>{notice}</p>}
          <div className="flex items-center justify-between gap-3 text-sm">
            <Link to="/forgot-password" style={{ color: 'var(--nebula-3)' }}>Forgot password?</Link>
            <button type="button" disabled={resending || !email.trim()} onClick={handleResend} style={{ color: 'var(--nebula-3)' }}>
              {resending ? 'Sending…' : 'Resend activation email'}
            </button>
          </div>
          <button type="button" onClick={() => setCodeOpen(!codeOpen)} className="text-sm text-left" style={{ color: 'var(--nebula-3)' }}>
            {codeOpen ? 'Hide activation code' : 'Activate with code'}
          </button>
        </form>

        {codeOpen && (
          <form onSubmit={handleActivate} className="card p-6 mt-4 flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter your email above and the 6-digit code from your activation email.</p>
            <label className="flex flex-col gap-1 text-sm">Activation code
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="px-3 py-2.5 tracking-[0.4em] text-center" placeholder="000000" />
            </label>
            <button type="submit" disabled={activating || !email.trim() || code.length !== 6} className="btn-primary py-2.5">{activating ? 'Activating…' : 'Activate account'}</button>
          </form>
        )}

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
          New to WheelSync? <Link to="/signup" style={{ color: 'var(--nebula-3)' }}>Create an account</Link>
        </p>
        </div>
      </div>
    </div>
  )
}
