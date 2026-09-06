import { useEffect, useState, type FormEvent } from 'react'

import { useAuth } from './AuthContext'
import { getAuthError } from './authApi'

export type AuthMode = 'login' | 'register'

interface AuthModalProps {
  isOpen: boolean
  initialMode: AuthMode
  onClose: () => void
}

export function AuthModal({ isOpen, initialMode, onClose }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setMessage(null)
    setFields({})
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setFields({})

    try {
      if (mode === 'register') {
        await register({ username: username.trim(), email: email.trim(), password })
      } else {
        await login({ email: email.trim(), password })
      }
      setUsername('')
      setEmail('')
      setPassword('')
      onClose()
    } catch (error) {
      const authError = getAuthError(error, mode === 'register' ? 'Registration failed.' : 'Login failed.')
      setMessage(authError.message)
      setFields(authError.fields)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-dialog" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close authentication dialog">
          <span aria-hidden="true">×</span>
        </button>

        <div className="auth-brandmark">
          <img src="/assets/iac-logo.jpeg" alt="" />
        </div>
        <p className="eyebrow">Ifriqiya Academic Circle</p>
        <h2 id="auth-title">{mode === 'register' ? 'Join the circle' : 'Welcome back'}</h2>
        <p className="auth-intro">
          {mode === 'register'
            ? 'Create your academic identity and start contributing.'
            : 'Continue building knowledge with your community.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')}>
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' ? (
            <label>
              <span>Username</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="amina.scholar"
                minLength={3}
                maxLength={30}
                autoFocus
              />
              {fields.username ? <small className="field-error">{fields.username}</small> : null}
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
              autoFocus={mode === 'login'}
            />
            {fields.email ? <small className="field-error">{fields.email}</small> : null}
          </label>

          <label>
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                minLength={mode === 'register' ? 8 : undefined}
                maxLength={72}
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fields.password ? <small className="field-error">{fields.password}</small> : null}
          </label>

          {message ? <p className="auth-error" role="alert">{message}</p> : null}

          <button className="button button--gold auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'register' ? 'Create my account' : 'Enter the circle'}
          </button>
        </form>

        <p className="auth-footnote">
          {mode === 'register' ? 'Already a member?' : 'New to the circle?'}{' '}
          <button type="button" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
            {mode === 'register' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </div>
  )
}
