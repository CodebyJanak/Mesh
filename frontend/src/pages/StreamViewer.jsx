import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'
import {
  LiveKitRoom, VideoTrack, useTracks, useConnectionState
} from '@livekit/components-react'
import { Track, ConnectionState } from 'livekit-client'
import { Radio, Users, Send, ArrowLeft, WifiOff, Loader, Trash2, Ban } from 'lucide-react'
import StreamGoal from '../components/StreamGoal'
import './StreamViewer.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const EMOJIS = ['❤️', '🔥', '😂', '👏', '😮', '🎉']

function VideoArea() {
  const tracks = useTracks([{ source: Track.Source.Camera }, { source: Track.Source.ScreenShare }])
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare)
  const cameraTrack = tracks.find(t => t.source === Track.Source.Camera)
  const activeTrack = screenTrack || cameraTrack
  if (!activeTrack) return (
    <div className="video-waiting">
      <div className="waiting-pulse"><Radio size={36} /></div>
      <p>Waiting for streamer...</p>
    </div>
  )
  return <div className="video-track-wrap"><VideoTrack trackRef={activeTrack} className="main-video" /></div>
}

function ConnectionBadge() {
  const state = useConnectionState()
  if (state === ConnectionState.Connected) return null
  return (
    <div className="conn-badge">
      <Loader size={12} className="spin-icon" />
      {state === ConnectionState.Connecting ? 'connecting...' : state}
    </div>
  )
}

// Floating emoji animation
function FloatingEmoji({ emoji, id }) {
  return <div key={id} className="floating-emoji" style={{ left: `${10 + Math.random() * 80}%` }}>{emoji}</div>
}

export default function StreamViewer() {
  const { streamKey } = useParams()
  const { user } = useAuth()
  const [stream, setStream] = useState(null)
  const [streamTitle, setStreamTitle] = useState('')
  const [token, setToken] = useState(null)
  const [wsUrl, setWsUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ended, setEnded] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [peakViewers, setPeakViewers] = useState(0)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatName, setChatName] = useState('')
  const [nameSet, setNameSet] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const chatEndRef = useRef(null)
  const socketRef = useRef(null)

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0]
  const isStreamer = stream && user && stream.user_id === user.id

  useEffect(() => {
    if (displayName) { setChatName(displayName); setNameSet(true) }
  }, [displayName])

  useEffect(() => {
    async function init() {
      const { data, error: dbErr } = await supabase
        .from('streams').select('*, profiles(username)').eq('stream_key', streamKey).single()
      if (dbErr || !data) { setError('Stream not found.'); setLoading(false); return }
      if (!data.is_live) { setError('This stream has ended.'); setLoading(false); return }
      setStream(data); setStreamTitle(data.title)
      const identity = displayName || `viewer_${Math.random().toString(36).substring(2, 7)}`
      try {
        const res = await fetch(`${BACKEND}/api/livekit/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamKey, identity, isStreamer: false })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setToken(json.token); setWsUrl(json.wsUrl)
      } catch (err) { setError('Failed to connect: ' + err.message) }
      setLoading(false)
    }
    init()
  }, [streamKey])

  useEffect(() => {
    const socket = io(BACKEND)
    socketRef.current = socket
    socket.on('connect', () => socket.emit('join_stream', streamKey))
    socket.on('viewer_count', ({ current, peak }) => { setViewerCount(current); setPeakViewers(peak) })
    socket.on('chat_message', msg => setMessages(prev => [...prev.slice(-199), msg]))
    socket.on('message_deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId)))
    socket.on('user_banned', ({ username }) => {
      if (username === chatName) setIsBanned(true)
      setMessages(prev => prev.filter(m => m.username !== username))
    })
    socket.on('user_unbanned', ({ username }) => {
      if (username === chatName) setIsBanned(false)
    })
    socket.on('banned', () => setIsBanned(true))
    socket.on('reaction', ({ emoji }) => {
      const id = Date.now() + Math.random()
      setFloatingEmojis(prev => [...prev, { emoji, id }])
      setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2500)
    })
    socket.on('title_updated', ({ title }) => setStreamTitle(title))
    socket.on('stream_ended', () => setEnded(true))
    return () => socket.disconnect()
  }, [streamKey, chatName])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = () => {
    if (!chatInput.trim() || !chatName.trim() || isBanned) return
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2,6)}`
    socketRef.current?.emit('chat_message', { streamKey, username: chatName, message: chatInput.trim(), msgId })
    setChatInput('')
  }

  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction', { streamKey, emoji, username: chatName })
  }

  const deleteMessage = (messageId) => {
    socketRef.current?.emit('delete_message', { streamKey, messageId })
  }

  const banUser = (username) => {
    socketRef.current?.emit('ban_user', { streamKey, username })
  }

  if (loading) return (
    <div className="sv-loading"><Radio size={28} className="spin-icon" /><span>connecting to stream...</span></div>
  )

  if (ended) return (
    <div className="sv-error">
      <Radio size={40} />
      <h2>Stream Ended</h2>
      <p style={{color:'var(--text-secondary)', fontSize:'13px'}}>The streamer has ended this broadcast.</p>
      <Link to="/discover" className="back-link"><ArrowLeft size={15} /> browse streams</Link>
    </div>
  )

  if (error) return (
    <div className="sv-error">
      <WifiOff size={40} />
      <h2>{error}</h2>
      <Link to="/discover" className="back-link"><ArrowLeft size={15} /> browse streams</Link>
    </div>
  )

  return (
    <div className="sv-layout">
      <div className="sv-video-col">
        <div className="sv-topbar">
          <Link to="/discover" className="sv-back"><ArrowLeft size={16} /></Link>
          <div className="sv-logo"><Radio size={16} /><span>mesh</span></div>
          <div className="sv-live-badge"><span className="live-dot" />LIVE</div>
          <div className="sv-viewer-count"><Users size={13} /><span>{viewerCount}</span></div>
        </div>

        <div className="sv-stream-info">
          <h1 className="sv-stream-title">{streamTitle}</h1>
          <div className="sv-stream-meta">
            <span className="sv-streamer">@{stream?.profiles?.username}</span>
            <span className="sv-dot">·</span>
            <span className="sv-category">{stream?.category}</span>
            {peakViewers > 0 && <><span className="sv-dot">·</span><span style={{color:'var(--text-secondary)'}}>peak {peakViewers}</span></>}
          </div>
          <div style={{marginTop:'8px'}}>
            <StreamGoal streamId={stream?.id} currentViewers={viewerCount} />
          </div>
        </div>

        <div className="sv-video-box">
          {/* Floating emoji reactions */}
          <div className="emoji-float-layer">
            {floatingEmojis.map(e => <FloatingEmoji key={e.id} emoji={e.emoji} id={e.id} />)}
          </div>

          {token && wsUrl ? (
            <LiveKitRoom token={token} serverUrl={wsUrl} connect={true} video={false} audio={false} className="lk-room">
              <ConnectionBadge />
              <VideoArea />
            </LiveKitRoom>
          ) : (
            <div className="video-waiting">
              <div className="waiting-pulse"><Radio size={36} /></div>
              <p>Stream starting...</p>
            </div>
          )}
        </div>

        {/* Emoji reaction bar */}
        <div className="emoji-bar">
          {EMOJIS.map(emoji => (
            <button key={emoji} className="emoji-btn" onClick={() => sendReaction(emoji)}>{emoji}</button>
          ))}
        </div>
      </div>

      <div className="sv-chat-col">
        <div className="chat-header">
          <span>live chat</span>
          <div className="chat-viewer-pill"><Users size={11} />{viewerCount}</div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty"><p>No messages yet.<br />Say hello! 👋</p></div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`chat-msg ${msg.username === chatName ? 'own' : ''}`}>
              <div className="msg-header">
                <span className="msg-user">@{msg.username}</span>
                {isStreamer && msg.username !== chatName && (
                  <div className="msg-mod-actions">
                    <button className="mod-btn" title="Delete" onClick={() => deleteMessage(msg.id)}><Trash2 size={11} /></button>
                    <button className="mod-btn ban" title="Ban user" onClick={() => banUser(msg.username)}><Ban size={11} /></button>
                  </div>
                )}
              </div>
              <span className="msg-text">{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          {isBanned ? (
            <div className="banned-notice">🚫 You have been banned from this chat.</div>
          ) : !nameSet ? (
            <div className="chat-name-prompt">
              <input type="text" placeholder="enter a display name..." value={chatName}
                onChange={e => setChatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && chatName.trim() && setNameSet(true)} autoFocus />
              <button onClick={() => chatName.trim() && setNameSet(true)} className="name-set-btn">join chat</button>
            </div>
          ) : (
            <div className="chat-send-row">
              <input type="text" placeholder="say something..." value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                maxLength={200} />
              <button className="send-btn" onClick={sendMessage} disabled={!chatInput.trim()}>
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
