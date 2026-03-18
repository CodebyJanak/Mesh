import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Radio, Eye, EyeOff } from 'lucide-react'
import './Auth.css'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) return setError('All fields are required.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)
    setError('')
    try {
      await signUp(form.email, form.password, form.username)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div className="auth-logo">
          <Radio size={22} />
          <span>mesh</span>
        </div>

        <h2>Create account</h2>
        <p className="auth-sub">Join Mesh and start streaming instantly</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>username</label>
            <input
              name="username"
              type="text"
              placeholder="your_handle"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>password</label>
            <div className="input-wrap">
              <input
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="min. 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className="toggle-pass" onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'creating account...' : 'create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">sign in</Link>
        </p>
      </div>
    </div>
  )
}
