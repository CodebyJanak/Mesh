import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { io } from 'socket.io-client'
import { Send, MessageSquare, ArrowLeft, User } from 'lucide-react'
import './DMs.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function DMs() {
  const { user } = useAuth()
  const { partnerId } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeout = useRef(null)

  useEffect(() => {
    fetchConversations()
    const socket = io(BACKEND)
    socketRef.current = socket
    socket.on('connect', () => socket.emit('join_user', user.id))
    socket.on('dm_typing', ({ fromUsername }) => {
      setTyping(true)
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => setTyping(false), 2000)
    })
    socket.on('new_dm', (msg) => {
      if (msg.sender_id === partnerId || msg.receiver_id === partnerId) {
        setMessages(prev => [...prev, msg])
      }
      fetchConversations()
    })
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (partnerId) fetchMessages()
  }, [partnerId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/dms/conversations`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    if (res.ok) setConversations(data)
    setLoading(false)
  }

  const fetchMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/dms/${partnerId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    if (res.ok) setMessages(data)

    // Get partner profile
    const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', partnerId).single()
    setPartnerInfo(profile)
  }

  const sendMessage = async () => {
    if (!input.trim() || !partnerId || sending) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/dms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ receiver_id: partnerId, message: input.trim() })
    })
    const data = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, data])
      setInput('')
      fetchConversations()
    }
    setSending(false)
  }

  const handleTyping = () => {
    socketRef.current?.emit('dm_typing', { toUserId: partnerId, fromUsername: user.user_metadata?.username })
  }

  return (
    <div className="dms-layout">
      {/* Sidebar */}
      <div className="dms-sidebar">
        <div className="dms-sidebar-header">
          <MessageSquare size={16} />
          <span>messages</span>
        </div>
        {loading ? (
          <div className="dms-loading">loading...</div>
        ) : conversations.length === 0 ? (
          <div className="dms-empty">no conversations yet</div>
        ) : conversations.map(conv => (
          <Link
            key={conv.partnerId}
            to={`/dms/${conv.partnerId}`}
            className={`conv-item ${partnerId === conv.partnerId ? 'active' : ''}`}
          >
            <div className="conv-avatar">{conv.partnerUsername?.[0]?.toUpperCase() || '?'}</div>
            <div className="conv-info">
              <div className="conv-name">@{conv.partnerUsername}</div>
              <div className="conv-last">{conv.lastMessage?.slice(0, 30)}{conv.lastMessage?.length > 30 ? '...' : ''}</div>
            </div>
            {conv.unread > 0 && <div className="conv-unread">{conv.unread}</div>}
          </Link>
        ))}
      </div>

      {/* Chat area */}
      <div className="dms-chat">
        {!partnerId ? (
          <div className="dms-select-prompt">
            <MessageSquare size={40} />
            <h3>select a conversation</h3>
            <p>Choose someone to message from the sidebar</p>
          </div>
        ) : (
          <>
            <div className="dms-chat-header">
              <button className="dms-back" onClick={() => navigate('/dms')}><ArrowLeft size={16} /></button>
              <div className="dms-partner-avatar">{partnerInfo?.username?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div className="dms-partner-name">@{partnerInfo?.username || '...'}</div>
                {typing && <div className="dms-typing">typing...</div>}
              </div>
            </div>

            <div className="dms-messages">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`dm-msg ${msg.sender_id === user.id ? 'own' : ''}`}>
                  <div className="dm-bubble">{msg.message}</div>
                  <div className="dm-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="dms-input-row">
              <input
                type="text"
                placeholder="send a message..."
                value={input}
                onChange={e => { setInput(e.target.value); handleTyping() }}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                maxLength={500}
              />
              <button className="dm-send-btn" onClick={sendMessage} disabled={!input.trim() || sending}>
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
