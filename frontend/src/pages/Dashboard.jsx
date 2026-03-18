import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Radio, Square, Copy, Check, BarChart2, Users, Clock,
  ExternalLink, Edit2, Save, X, Tv2, Key, Image, TrendingUp, Video, User
} from 'lucide-react'
import StreamBroadcast from '../components/StreamBroadcast'
import Recordings from '../components/Recordings'
import './Dashboard.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const CATEGORIES = ['General', 'Development', 'Gaming', 'Education', 'Events', 'Music', 'Talk']

function GoalTipPanel({ streamId, user }) {
  const [goal, setGoal] = useState(null)
  const [goalForm, setGoalForm] = useState({ title: '', target_viewers: 100 })
  const [kofiLink, setKofiLink] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [savingKofi, setSavingKofi] = useState(false)

  useEffect(() => {
    if (!streamId) return
    fetch(`${BACKEND}/api/goals/${streamId}`).then(r => r.json()).then(d => {
      if (d?.id) { setGoal(d); setGoalForm({ title: d.title, target_viewers: d.target_viewers }) }
    })
    if (user) {
      supabase.from('profiles').select('kofi_link').eq('id', user.id).single()
        .then(({ data }) => { if (data?.kofi_link) setKofiLink(data.kofi_link) })
    }
  }, [streamId])

  const saveGoal = async () => {
    if (!goalForm.title) return
    setSavingGoal(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ stream_id: streamId, ...goalForm })
    })
    const data = await res.json()
    if (res.ok) setGoal(data)
    setSavingGoal(false)
  }

  const deleteGoal = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/goals/${streamId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setGoal(null)
  }

  const saveKofi = async () => {
    setSavingKofi(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/profiles/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ kofi_link: kofiLink })
    })
    setSavingKofi(false)
  }

  return (
    <div className="goal-tip-panel">
      <div className="gtp-section">
        <div className="section-label" style={{marginBottom:'12px'}}>stream goal</div>
        {goal ? (
          <div className="goal-set-display">
            <div className="goal-set-info">
              <span className="goal-set-title">{goal.title}</span>
              <span className="goal-set-target">target: {goal.target_viewers} viewers</span>
            </div>
            <button className="delete-goal-btn" onClick={deleteGoal}>remove</button>
          </div>
        ) : (
          <div className="goal-form">
            <input type="text" placeholder="Goal title e.g. reach 50 viewers!" className="goal-input"
              value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
            <div className="goal-form-row">
              <input type="number" placeholder="Target viewers" className="goal-input"
                value={goalForm.target_viewers} min={1} max={10000}
                onChange={e => setGoalForm(f => ({ ...f, target_viewers: parseInt(e.target.value) || 100 }))} />
              <button className="btn-accent" onClick={saveGoal} disabled={savingGoal}>
                {savingGoal ? 'saving...' : 'set goal'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="gtp-section">
        <div className="section-label" style={{marginBottom:'12px'}}>tip link (Ko-fi)</div>
        <div className="kofi-row">
          <input type="url" placeholder="https://ko-fi.com/yourusername" className="goal-input"
            value={kofiLink} onChange={e => setKofiLink(e.target.value)} />
          <button className="btn-accent" onClick={saveKofi} disabled={savingKofi}>
            {savingKofi ? 'saving...' : 'save'}
          </button>
        </div>
        {kofiLink && (
          <a href={kofiLink} target="_blank" rel="noopener noreferrer" className="kofi-preview">
            ☕ {kofiLink}
          </a>
        )}
        <p style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'8px'}}>
          This link will appear on your stream viewer page so viewers can tip you.
        </p>
      </div>
    </div>
  )
}

function generateStreamKey() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function useDuration(startedAt) {
  const [duration, setDuration] = useState('00:00')
  useEffect(() => {
    if (!startedAt) return
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt)) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setDuration(h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [startedAt])
  return duration
}

export default function Dashboard() {
  const { user } = useAuth()
  const [streams, setStreams] = useState([])
  const [activeStream, setActiveStream] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'General', thumbnail_url: '' })
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [peakViewers, setPeakViewers] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [activeTab, setActiveTab] = useState('broadcast') // broadcast | obs | history
  const duration = useDuration(activeStream?.started_at)
  const username = user?.user_metadata?.username || user?.email?.split('@')[0]

  useEffect(() => { fetchStreams() }, [])

  const fetchStreams = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('streams').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) {
      setStreams(data)
      const live = data.find(s => s.is_live)
      if (live) {
        setActiveStream(live)
        setPeakViewers(live.peak_viewers || 0)
      }
    }
    setLoading(false)
  }

  const handleCreate = async e => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Stream title is required.')
    setCreating(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/streams/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ title: form.title, category: form.category, thumbnail_url: form.thumbnail_url || null })
    })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else { setActiveStream(json); setStreams(prev => [json, ...prev]); setForm({ title: '', category: 'General', thumbnail_url: '' }) }
    setCreating(false)
  }

  const handleEnd = async () => {
    if (!activeStream) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/streams/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ stream_id: activeStream.id })
    })
    setActiveStream(null); setViewerCount(0); setPeakViewers(0); fetchStreams()
  }

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) return
    setSavingTitle(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/streams/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ stream_id: activeStream.id, title: newTitle.trim() })
    })
    const json = await res.json()
    if (res.ok) { setActiveStream(json); setEditingTitle(false) }
    setSavingTitle(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/stream/${activeStream.stream_key}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const copyKey = () => {
    navigator.clipboard.writeText(activeStream.stream_key)
    setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000)
  }

  if (loading) return (
    <div className="dashboard-loading"><Radio size={24} className="spin-icon" /><span>loading dashboard...</span></div>
  )

  return (
    <div className="dashboard">
      <div className="dashboard-header fade-up">
        <div>
          <h1>streamer dashboard</h1>
          <p>@{username}</p>
        </div>
        {activeStream && <div className="live-badge"><span className="live-dot" />LIVE</div>}
      </div>

      {activeStream ? (
        <div className="active-stream fade-up fade-up-1">
          {/* Stream title row */}
          <div className="active-stream-header">
            <div className="stream-title-area">
              <div className="stream-status-label">now streaming</div>
              {editingTitle ? (
                <div className="title-edit-row">
                  <input
                    className="title-input"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                  />
                  <button className="icon-btn accent" onClick={handleSaveTitle} disabled={savingTitle}><Save size={15} /></button>
                  <button className="icon-btn" onClick={() => setEditingTitle(false)}><X size={15} /></button>
                </div>
              ) : (
                <div className="title-display-row">
                  <h2>{activeStream.title}</h2>
                  <button className="icon-btn" onClick={() => { setNewTitle(activeStream.title); setEditingTitle(true) }}>
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              <span className="stream-cat">{activeStream.category}</span>
            </div>
            <button className="end-btn" onClick={handleEnd}>
              <Square size={14} fill="currentColor" />end stream
            </button>
          </div>

          {/* Link */}
          <div className="stream-link-box">
            <div className="link-label">shareable link</div>
            <div className="link-row">
              <span className="link-text">{window.location.origin}/stream/{activeStream.stream_key}</span>
              <div className="link-actions">
                <button className="copy-btn" onClick={copyLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'copied!' : 'copy'}
                </button>
                <Link to={`/stream/${activeStream.stream_key}`} target="_blank" className="copy-btn">
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="stream-stats">
            <div className="stat">
              <Users size={15} />
              <span className="stat-label">viewers</span>
              <span className="stat-value">{viewerCount}</span>
            </div>
            <div className="stat">
              <TrendingUp size={15} />
              <span className="stat-label">peak</span>
              <span className="stat-value">{Math.max(peakViewers, activeStream.peak_viewers || 0)}</span>
            </div>
            <div className="stat">
              <Clock size={15} />
              <span className="stat-label">duration</span>
              <span className="stat-value duration-val">{duration}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="dashboard-tabs">
            <button className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
              <Tv2 size={13} /> broadcast
            </button>
            <button className={`tab-btn ${activeTab === 'obs' ? 'active' : ''}`} onClick={() => setActiveTab('obs')}>
              <Key size={13} /> OBS setup
            </button>
            <button className={`tab-btn ${activeTab === 'recordings' ? 'active' : ''}`} onClick={() => setActiveTab('recordings')}>
              <Video size={13} /> recordings
            </button>
            <button className={`tab-btn ${activeTab === 'goal' ? 'active' : ''}`} onClick={() => setActiveTab('goal')}>
              <User size={13} /> goal & tips
            </button>
          </div>

          {activeTab === 'broadcast' && (
            <StreamBroadcast streamKey={activeStream.stream_key} />
          )}

          {activeTab === 'goal' && (
            <GoalTipPanel streamId={activeStream?.id} user={user} />
          )}

          {activeTab === 'recordings' && (
            <Recordings activeStream={activeStream} />
          )}

          {activeTab === 'obs' && (
            <div className="obs-panel">
              <p className="obs-desc">Stream using OBS or any RTMP-compatible software.</p>
              <div className="obs-field">
                <span className="obs-label">RTMP Server URL</span>
                <div className="obs-value">
                  <code>rtmp://your-media-server.com/live</code>
                  <span className="obs-note">(configure your media server in Phase 4)</span>
                </div>
              </div>
              <div className="obs-field">
                <span className="obs-label">Stream Key</span>
                <div className="link-row">
                  <code className="key-text">{activeStream.stream_key}</code>
                  <button className="copy-btn" onClick={copyKey}>
                    {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    {copiedKey ? 'copied!' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="obs-steps">
                <div className="obs-step"><span>1</span> Open OBS → Settings → Stream</div>
                <div className="obs-step"><span>2</span> Service: Custom, paste Server URL above</div>
                <div className="obs-step"><span>3</span> Paste your Stream Key</div>
                <div className="obs-step"><span>4</span> Click "Start Streaming" in OBS</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="create-stream fade-up fade-up-1">
          <h2>start a new stream</h2>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleCreate} className="stream-form">
            <div className="field">
              <label>stream title</label>
              <input type="text" placeholder="e.g. Coding a Live Chat App" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field">
              <label>category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label><Image size={12} style={{display:'inline', marginRight:'4px'}} />thumbnail url <span style={{color:'var(--text-muted)'}}>(optional)</span></label>
              <input type="url" placeholder="https://example.com/image.jpg" value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} />
            </div>
            <button type="submit" className="start-btn" disabled={creating}>
              <Radio size={16} />{creating ? 'starting...' : 'go live'}
            </button>
          </form>
        </div>
      )}

      {/* Stream History */}
      <div className="stream-history fade-up fade-up-2">
        <div className="section-label"><BarChart2 size={15} />stream history</div>
        {streams.filter(s => !s.is_live).length === 0 ? (
          <div className="empty-history">no past streams yet</div>
        ) : (
          <div className="history-list">
            {streams.filter(s => !s.is_live).map(stream => (
              <div key={stream.id} className="history-item">
                <div>
                  <div className="history-title">{stream.title}</div>
                  <div className="history-meta">
                    {stream.category} · {new Date(stream.created_at).toLocaleDateString()}
                    {stream.peak_viewers > 0 && ` · peak: ${stream.peak_viewers}`}
                  </div>
                </div>
                <div className="ended-badge">ended</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
