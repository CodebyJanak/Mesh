import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Bell, Radio, MessageSquare, UserPlus, X } from 'lucide-react'
import './NotificationBell.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const icons = {
  stream_live: <Radio size={14} />,
  new_follower: <UserPlus size={14} />,
  new_dm: <MessageSquare size={14} />,
}

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Realtime subscription
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnread(u => u + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/notifications`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    if (res.ok) {
      setNotifications(data)
      setUnread(data.filter(n => !n.read).length)
    }
  }

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const handleNotifClick = (notif) => {
    if (notif.link) navigate(notif.link)
    setOpen(false)
  }

  if (!user) return null

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button className="notif-btn" onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead() }}>
        <Bell size={16} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel fade-in">
          <div className="notif-panel-header">
            <span>notifications</span>
            <button className="notif-close" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">no notifications yet</div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''} ${n.link ? 'clickable' : ''}`}
                onClick={() => handleNotifClick(n)}
              >
                <div className={`notif-icon type-${n.type}`}>
                  {icons[n.type] || <Bell size={14} />}
                </div>
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  {n.message && <div className="notif-message">{n.message}</div>}
                  <div className="notif-time">
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!n.read && <div className="notif-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
