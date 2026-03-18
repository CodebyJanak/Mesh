import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart2, TrendingUp, Users, Clock, Radio, Eye } from 'lucide-react'
import './Analytics.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function Analytics() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  const formatDuration = (s) => {
    if (!s) return '0m'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading) return (
    <div className="analytics-loading"><BarChart2 size={22} className="spin-icon" /><span>loading analytics...</span></div>
  )

  return (
    <div className="analytics-page">
      <div className="analytics-header fade-up">
        <h1>analytics</h1>
        <p>your streaming performance overview</p>
      </div>

      {/* Overview cards */}
      <div className="analytics-grid fade-up fade-up-1">
        {[
          { icon: <Radio size={18} />, label: 'total streams', value: stats?.totalStreams || 0, color: 'accent' },
          { icon: <Users size={18} />, label: 'total viewers', value: stats?.totalViewers || 0, color: 'blue' },
          { icon: <TrendingUp size={18} />, label: 'peak viewers', value: stats?.peakViewers || 0, color: 'yellow' },
          { icon: <Clock size={18} />, label: 'hours streamed', value: `${stats?.totalHours || 0}h`, color: 'purple' },
        ].map((card, i) => (
          <div key={i} className={`analytics-card color-${card.color}`}>
            <div className="ac-icon">{card.icon}</div>
            <div className="ac-value">{card.value}</div>
            <div className="ac-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Stream history table */}
      <div className="analytics-table-wrap fade-up fade-up-2">
        <div className="section-label"><BarChart2 size={14} />stream history</div>
        {!stats?.streams?.length ? (
          <div className="analytics-empty">no streams yet — go live to see stats!</div>
        ) : (
          <div className="analytics-table">
            <div className="at-header">
              <span>title</span>
              <span>peak</span>
              <span>total</span>
              <span>duration</span>
              <span>date</span>
            </div>
            {stats.streams.map(s => {
              const duration = s.started_at && s.ended_at
                ? Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
                : 0
              return (
                <div key={s.id} className={`at-row ${s.is_live ? 'live-row' : ''}`}>
                  <span className="at-title">
                    {s.is_live && <span className="live-pip" />}
                    {s.title}
                  </span>
                  <span>{s.peak_viewers || 0}</span>
                  <span>{s.total_viewers || 0}</span>
                  <span>{formatDuration(duration)}</span>
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
