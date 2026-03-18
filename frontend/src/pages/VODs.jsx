import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Play, Eye, Clock, Radio, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './VODs.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function VODs() {
  const { user } = useAuth()
  const [vods, setVods] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [playUrl, setPlayUrl] = useState(null)

  useEffect(() => { fetchVods() }, [])

  const fetchVods = async () => {
    const res = await fetch(`${BACKEND}/api/vods`)
    const data = await res.json()
    if (res.ok) setVods(data)
    setLoading(false)
  }

  const openVod = async (vod) => {
    const res = await fetch(`${BACKEND}/api/vods/${vod.id}`)
    const data = await res.json()
    if (res.ok) { setSelected(data); setPlayUrl(data.playback_url) }
  }

  const deleteVod = async (id) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/vods/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setVods(prev => prev.filter(v => v.id !== id))
    if (selected?.id === id) { setSelected(null); setPlayUrl(null) }
  }

  const fmt = (s) => {
    if (!s) return ''
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}h` : `${m}m`
  }

  return (
    <div className="vods-page">
      {selected && (
        <div className="vod-player-overlay" onClick={() => { setSelected(null); setPlayUrl(null) }}>
          <div className="vod-player-wrap" onClick={e => e.stopPropagation()}>
            <div className="vod-player-header">
              <div>
                <h2>{selected.title}</h2>
                <div className="vod-player-meta">
                  @{selected.profiles?.username} · {new Date(selected.created_at).toLocaleDateString()}
                  {selected.duration_seconds > 0 && ` · ${fmt(selected.duration_seconds)}`}
                </div>
              </div>
              <button className="vod-close-btn" onClick={() => { setSelected(null); setPlayUrl(null) }}>✕</button>
            </div>
            {playUrl ? (
              <video className="vod-video" src={playUrl} controls autoPlay />
            ) : (
              <div className="vod-no-url">
                <Radio size={32} />
                <p>No recording file available for this VOD.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="vods-header fade-up">
        <h1>video archive</h1>
        <p>past streams saved as VODs</p>
      </div>

      {loading ? (
        <div className="vods-loading"><Play size={20} className="spin-icon" /><span>loading vods...</span></div>
      ) : vods.length === 0 ? (
        <div className="vods-empty">
          <Play size={40} />
          <h3>no VODs yet</h3>
          <p>Past streams saved as recordings will appear here.</p>
        </div>
      ) : (
        <div className="vods-grid fade-up fade-up-1">
          {vods.map(vod => (
            <div key={vod.id} className="vod-card">
              <div className="vod-thumb" onClick={() => openVod(vod)}>
                {vod.thumbnail_url
                  ? <img src={vod.thumbnail_url} alt={vod.title} />
                  : <div className="vod-thumb-placeholder"><Radio size={28} /></div>
                }
                <div className="vod-play-overlay"><Play size={28} fill="white" /></div>
                {vod.duration_seconds > 0 && (
                  <div className="vod-duration"><Clock size={10} />{fmt(vod.duration_seconds)}</div>
                )}
              </div>
              <div className="vod-info">
                <div className="vod-title" onClick={() => openVod(vod)}>{vod.title}</div>
                <div className="vod-meta">
                  <Link to={`/profile/${vod.profiles?.username}`} className="vod-author">
                    @{vod.profiles?.username}
                  </Link>
                  <span>·</span>
                  <span className="vod-views"><Eye size={11} />{vod.views || 0}</span>
                  <span>·</span>
                  <span>{new Date(vod.created_at).toLocaleDateString()}</span>
                </div>
                {user && vod.user_id === user.id && (
                  <button className="vod-delete-btn" onClick={() => deleteVod(vod.id)}>
                    <Trash2 size={12} />delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
