import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Calendar, Plus, Trash2, Clock, Radio, X } from 'lucide-react'
import './Scheduled.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const CATEGORIES = ['General', 'Development', 'Gaming', 'Education', 'Events', 'Music', 'Talk']

export default function Scheduled() {
  const { user } = useAuth()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'General', description: '', scheduled_at: '', thumbnail_url: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchScheduled() }, [])

  const fetchScheduled = async () => {
    const res = await fetch(`${BACKEND}/api/scheduled`)
    const data = await res.json()
    if (res.ok) setStreams(data)
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title || !form.scheduled_at) return setError('Title and date are required.')
    setSaving(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (res.ok) {
      setStreams(prev => [data, ...prev].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
      setShowForm(false)
      setForm({ title: '', category: 'General', description: '', scheduled_at: '', thumbnail_url: '' })
    } else setError(data.error)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/scheduled/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setStreams(prev => prev.filter(s => s.id !== id))
  }

  const formatDate = (dt) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const timeUntil = (dt) => {
    const diff = new Date(dt) - new Date()
    if (diff < 0) return 'starting soon'
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `in ${d}d ${h % 24}h`
    if (h > 0) return `in ${h}h`
    return `in ${Math.floor(diff / 60000)}m`
  }

  return (
    <div className="scheduled-page">
      <div className="scheduled-header fade-up">
        <div>
          <h1>upcoming streams</h1>
          <p>browse scheduled live streams from creators</p>
        </div>
        {user && (
          <button className="btn-accent" onClick={() => setShowForm(s => !s)}>
            <Plus size={15} />schedule stream
          </button>
        )}
      </div>

      {showForm && (
        <div className="schedule-form-card fade-up">
          <div className="form-card-header">
            <h3>schedule a stream</h3>
            <button className="close-btn" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={handleCreate} className="schedule-form">
            <div className="form-row">
              <div className="field">
                <label>stream title</label>
                <input type="text" placeholder="What are you streaming?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field">
                <label>category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>scheduled date & time</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} min={new Date().toISOString().slice(0, 16)} />
            </div>
            <div className="field">
              <label>description (optional)</label>
              <input type="text" placeholder="Tell viewers what to expect..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="field">
              <label>thumbnail url (optional)</label>
              <input type="url" placeholder="https://..." value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Calendar size={15} />{saving ? 'scheduling...' : 'schedule stream'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="scheduled-loading"><Clock size={20} className="spin-icon" /><span>loading...</span></div>
      ) : streams.length === 0 ? (
        <div className="scheduled-empty">
          <Calendar size={40} />
          <h3>no upcoming streams</h3>
          <p>Be the first to schedule a stream!</p>
        </div>
      ) : (
        <div className="scheduled-list fade-up fade-up-1">
          {streams.map(s => (
            <div key={s.id} className="scheduled-card">
              <div className="scheduled-thumb">
                {s.thumbnail_url
                  ? <img src={s.thumbnail_url} alt={s.title} onError={e => e.target.style.display = 'none'} />
                  : <div className="thumb-placeholder"><Radio size={22} /></div>
                }
              </div>
              <div className="scheduled-info">
                <div className="scheduled-title">{s.title}</div>
                <div className="scheduled-meta">
                  <span className="sched-cat">{s.category}</span>
                  <span>·</span>
                  <span>@{s.profiles?.username}</span>
                </div>
                {s.description && <div className="scheduled-desc">{s.description}</div>}
              </div>
              <div className="scheduled-time">
                <div className="time-until">{timeUntil(s.scheduled_at)}</div>
                <div className="time-date">{formatDate(s.scheduled_at)}</div>
              </div>
              {user && s.user_id === user.id && (
                <button className="delete-sched-btn" onClick={() => handleDelete(s.id)} title="Delete">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
