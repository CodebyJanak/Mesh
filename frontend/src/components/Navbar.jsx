import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Radio, LayoutDashboard, Compass, LogOut, LogIn, User, MessageSquare, BarChart2 } from 'lucide-react'
import NotificationBell from './NotificationBell'
import './Navbar.css'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const username = user?.user_metadata?.username || user?.email?.split('@')[0]

  const handleSignOut = async () => { await signOut(); navigate('/') }
  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : ''

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <Radio size={18} strokeWidth={2.5} />
        <span>mesh</span>
      </Link>

      <div className="navbar-links">
        <Link to="/discover" className={isActive('/discover')}>
          <Compass size={15} />discover
        </Link>
        <Link to="/scheduled" className={isActive('/scheduled')}>
          <Radio size={15} />upcoming
        </Link>
        <Link to="/vods" className={isActive('/vods')}>
          <BarChart2 size={15} />vods
        </Link>
        {user && (
          <>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              <LayoutDashboard size={15} />dashboard
            </Link>
            <Link to="/analytics" className={isActive('/analytics')}>
              <BarChart2 size={15} />analytics
            </Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <Link to="/dms" className="navbar-icon-btn" title="Messages">
              <MessageSquare size={16} />
            </Link>
            <NotificationBell />
            <Link to={`/profile/${username}`} className="navbar-user">
              <User size={12} />@{username}
            </Link>
            <button className="btn-ghost" onClick={handleSignOut}>
              <LogOut size={15} />logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost"><LogIn size={15} />login</Link>
            <Link to="/register" className="btn-accent">go live</Link>
          </>
        )}
      </div>
    </nav>
  )
}
