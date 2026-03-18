import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import StreamViewer from './pages/StreamViewer'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import DMs from './pages/DMs'
import Scheduled from './pages/Scheduled'
import VODs from './pages/VODs'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>
      loading...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full screen - no navbar */}
        <Route path="/stream/:streamKey" element={<StreamViewer />} />
        {/* All pages with navbar */}
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/scheduled" element={<Scheduled />} />
              <Route path="/vods" element={<VODs />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/dms" element={<ProtectedRoute><DMs /></ProtectedRoute>} />
              <Route path="/dms/:partnerId" element={<ProtectedRoute><DMs /></ProtectedRoute>} />
            </Routes>
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
