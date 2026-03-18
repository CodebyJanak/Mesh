import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Radio, Users, UserPlus, UserMinus, Edit2, Save, X, Calendar, TrendingUp } from 'lucide-react'
import './Profile.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProfile() }, [username])

  const fetchProfile = async () => {
    setLoading(true)
    const res = await fetch(`${BACKEND}/api/profiles/${username}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    setProfile(data)
    setStreams(data.streams || [])
    setEditForm({ bio: data.bio || '', avatar_url: data.avatar_url || '' })

    if (user) {
      const myUsername = user.user_metadata?.username || user.email?.split('@')[0]
      setIsOwner(myUsername === username)

      if (myUsername !== username) {
        // Check follow status
        const { data: { session } } = await supabase.auth.getSession()
        const statusRes = await fetch(
          `${BACKEND}/api/profiles/follow/status?follower_id=${user.id}&following_id=${data.id}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )
        const status = await statusRes.json()
        setFollowing(status.following)
      }
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!user) return
    setFollowLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const method = following ? 'DELETE' : 'POST'
    await fetch(`${BACKEND}/api/profiles/follow`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ following_id: profile.id })
    })
    setFollowing(f => !f)
    setProfile(p => ({ ...p, follower_count: p.follower_count + (following ? -1 : 1) }))
    setFollowLoading(false)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/profiles/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(editForm)
    })
    const data = await res.json()
    if (res.ok) { setProfile(p => ({ ...p, ...data })); setEditing(false) }
    setSaving(false)
  }

  if (loading) return (
    <div className="profile-loading"><Radio size={24} className="spin-icon" /><span>loading profile...</span></div>
  )

  if (error) return (
    <div className="profile-error">
      <h2>Profile not found</h2>
      <Link to="/discover">← back to discover</Link>
    </div>
  )

  const liveStream = streams.find(s => s.is_live)
  const pastStreams = streams.filter(s => !s.is_live)

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header fade-up">
        <div className="profile-avatar">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} onError={e => e.target.style.display='none'} />
            : <div className="avatar-placeholder">{profile.username[0].toUpperCase()}</div>
          }
          {liveStream && <div className="avatar-live-dot" />}
        </div>

        <div className="profile-info">
          <div className="profile-name-row">
            <h1>@{profile.username}</h1>
            {liveStream && (
              <Link to={`/stream/${liveStream.stream_key}`} className="profile-live-badge">
                <span className="live-dot" />LIVE NOW
              </Link>
            )}
          </div>

          {editing ? (
            <div className="profile-edit-form">
              <textarea
                placeholder="Write a bio..."
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
              />
              <input
                type="url"
                placeholder="Avatar image URL"
                value={editForm.avatar_url}
                onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value }))}
              />
              <div className="edit-actions">
                <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                  <Save size={14} />{saving ? 'saving...' : 'save'}
                </button>
                <button className="cancel-btn" onClick={() => setEditing(false)}><X size={14} />cancel</button>
              </div>
            </div>
          ) : (
            <p className="profile-bio">{profile.bio || 'No bio yet.'}</p>
          )}

          <div className="profile-meta">
            <div className="meta-item">
              <Users size={13} />
              <span><strong>{profile.follower_count || 0}</strong> followers</span>
            </div>
            <div className="meta-item">
              <Radio size={13} />
              <span><strong>{streams.length}</strong> streams</span>
            </div>
            <div className="meta-item">
              <Calendar size={13} />
              <span>joined {new Date(profile.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {isOwner ? (
            <button className="edit-profile-btn" onClick={() => setEditing(e => !e)}>
              <Edit2 size={15} />edit profile
            </button>
          ) : user ? (
            <button className={`follow-btn ${following ? 'following' : ''}`} onClick={handleFollow} disabled={followLoading}>
              {following ? <><UserMinus size={15} />unfollow</> : <><UserPlus size={15} />follow</>}
            </button>
          ) : (
            <Link to="/login" className="follow-btn">
              <UserPlus size={15} />follow
            </Link>
          )}
        </div>
      </div>

      {/* Live now */}
      {liveStream && (
        <div className="profile-live-stream fade-up">
          <div className="section-label"><span className="live-dot" />streaming now</div>
          <Link to={`/stream/${liveStream.stream_key}`} className="live-stream-card">
            <div className="live-card-thumb">
              {liveStream.thumbnail_url
                ? <img src={liveStream.thumbnail_url} alt={liveStream.title} />
                : <div className="thumb-placeholder"><Radio size={24} /></div>
              }
            </div>
            <div className="live-card-info">
              <div className="live-card-title">{liveStream.title}</div>
              <div className="live-card-meta">{liveStream.category} · {liveStream.peak_viewers || 0} viewers</div>
            </div>
            <div className="watch-btn">watch →</div>
          </Link>
        </div>
      )}

      {/* Past streams */}
      <div className="profile-streams fade-up fade-up-2">
        <div className="section-label"><TrendingUp size={14} />past streams ({pastStreams.length})</div>
        {pastStreams.length === 0 ? (
          <div className="empty-streams">no past streams yet</div>
        ) : (
          <div className="past-streams-grid">
            {pastStreams.map(stream => (
              <div key={stream.id} className="past-stream-card">
                <div className="past-thumb">
                  {stream.thumbnail_url
                    ? <img src={stream.thumbnail_url} alt={stream.title} />
                    : <div className="thumb-placeholder small"><Radio size={18} /></div>
                  }
                </div>
                <div className="past-stream-info">
                  <div className="past-stream-title">{stream.title}</div>
                  <div className="past-stream-meta">
                    {stream.category} · {new Date(stream.created_at).toLocaleDateString()}
                    {stream.peak_viewers > 0 && ` · peak ${stream.peak_viewers}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
