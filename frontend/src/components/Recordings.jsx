import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Video, Download, Trash2, Loader, Circle, Square } from 'lucide-react'
import './Recordings.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function Recordings({ activeStream }) {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    fetchRecordings()
    return () => stopRecording()
  }, [])

  const fetchRecordings = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${BACKEND}/api/recordings`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    if (res.ok) setRecordings(data)
    setLoading(false)
  }

  const startRecording = async () => {
    if (!activeStream) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        await uploadRecording(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start(1000)
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      console.error('Recording failed:', err)
      alert('Could not start recording: ' + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    clearInterval(timerRef.current)
    setRecording(false)
    setRecordingTime(0)
  }

  const uploadRecording = async (blob) => {
    const { data: { session } } = await supabase.auth.getSession()

    // Get signed upload URL
    const urlRes = await fetch(`${BACKEND}/api/recordings/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ stream_key: activeStream.stream_key })
    })
    const { upload_url, file_path } = await urlRes.json()

    // Upload to Supabase Storage
    await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/webm' },
      body: blob
    })

    // Save metadata
    await fetch(`${BACKEND}/api/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        stream_id: activeStream.id,
        file_path,
        file_size: blob.size,
        duration_seconds: recordingTime
      })
    })

    fetchRecordings()
  }

  const deleteRecording = async (id) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND}/api/recordings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setRecordings(prev => prev.filter(r => r.id !== id))
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="recordings-panel">
      {/* Record controls */}
      {activeStream && (
        <div className="record-controls">
          {recording ? (
            <div className="recording-active">
              <div className="rec-indicator"><Circle size={10} fill="currentColor" />REC {formatTime(recordingTime)}</div>
              <button className="stop-rec-btn" onClick={stopRecording}>
                <Square size={13} fill="currentColor" />stop & save
              </button>
            </div>
          ) : (
            <button className="start-rec-btn" onClick={startRecording}>
              <Circle size={13} fill="currentColor" />start recording
            </button>
          )}
          <p className="rec-note">Records your camera/screen locally then uploads to Supabase Storage.</p>
        </div>
      )}

      {/* Recordings list */}
      <div className="recordings-list">
        {loading ? (
          <div className="rec-loading"><Loader size={16} className="spin-icon" /><span>loading recordings...</span></div>
        ) : recordings.length === 0 ? (
          <div className="rec-empty">
            <Video size={28} />
            <p>No recordings yet.<br />Start a stream and hit record!</p>
          </div>
        ) : recordings.map(rec => (
          <div key={rec.id} className="recording-item">
            <div className="rec-icon"><Video size={16} /></div>
            <div className="rec-info">
              <div className="rec-title">{rec.streams?.title || 'Untitled stream'}</div>
              <div className="rec-meta">
                {new Date(rec.created_at).toLocaleDateString()} ·
                {rec.duration_seconds > 0 ? ` ${formatTime(rec.duration_seconds)} · ` : ' '}
                {formatSize(rec.file_size)}
              </div>
            </div>
            <div className="rec-actions">
              {rec.download_url && (
                <a href={rec.download_url} download className="rec-btn" title="Download">
                  <Download size={14} />
                </a>
              )}
              <button className="rec-btn danger" onClick={() => deleteRecording(rec.id)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
