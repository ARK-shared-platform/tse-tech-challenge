import { useState } from 'react'
import ErrorBanner from '../components/ErrorBanner'

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  dob: '',
  yearsExperience: ''
}

export default function RegisterPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Red herring: deprecation warning fires on every submission
    console.warn(
      'DeprecationWarning: legacyFormMode is deprecated and will be removed in a future release. ' +
      'Please migrate to formMode v2 before upgrading.'
    )

    setStatus('loading')

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          dob: form.dob,
          yearsExperience: form.yearsExperience
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
      } else {
        setStatus('success')
        setForm(INITIAL_FORM)
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="page-title">Create your profile</h1>
          <p className="page-subtitle">Join the Velora platform to get started.</p>
        </div>

        {status === 'success' && (
          <div className="success-banner">
            Profile registered successfully. Welcome to Velora!
          </div>
        )}

        {status === 'error' && (
          <ErrorBanner />
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dob">Date of birth</label>
            <input
              id="dob"
              name="dob"
              type="date"
              className="form-input"
              value={form.dob}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="yearsExperience">Years of experience</label>
            <input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min="0"
              className="form-input"
              value={form.yearsExperience}
              onChange={handleChange}
              placeholder="e.g. 3"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Registering...' : 'Create profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
