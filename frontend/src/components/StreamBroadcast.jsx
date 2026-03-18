import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoTrack
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Monitor, Camera, Mic, MicOff, VideoOff, MonitorOff, Loader } from 'lucide-react'
import './StreamBroadcast.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// Inner component - uses LiveKit hooks, must be inside LiveKitRoom
function BroadcastControls({ onEnd }) {
  const { localParticipant } = useLocalParticipant()
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ])
  const previewTrack = tracks[0]

  const toggleCamera = async () => {
    setBusy(true)
    try {
      await localParticipant.setCameraEnabled(!camOn)
      setCamOn(v => !v)
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  const toggleMic = async () => {
    setBusy(true)
    try {
      await localParticipant.setMicrophoneEnabled(!micOn)
      setMicOn(v => !v)
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  const toggleScreen = async () => {
    setBusy(true)
    try {
      await localParticipant.setScreenShareEnabled(!screenOn)
      setScreenOn(v => !v)
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  return (
    <div className="broadcast-inner">
      {/* Preview */}
      <div className="broadcast-preview">
        {previewTrack ? (
          <VideoTrack trackRef={previewTrack} className="preview-video" />
        ) : (
          <div className="preview-placeholder">
            <Monitor size={28} />
            <span>no source active</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="broadcast-controls">
        <button
          className={`bc-btn ${camOn ? 'active' : ''}`}
          onClick={toggleCamera}
          disabled={busy}
          title="Toggle Camera"
        >
          {camOn ? <Camera size={16} /> : <VideoOff size={16} />}
          <span>{camOn ? 'cam on' : 'cam off'}</span>
        </button>

        <button
          className={`bc-btn ${micOn ? 'active' : ''}`}
          onClick={toggleMic}
          disabled={busy}
          title="Toggle Mic"
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          <span>{micOn ? 'mic on' : 'mic off'}</span>
        </button>

        <button
          className={`bc-btn ${screenOn ? 'active-screen' : ''}`}
          onClick={toggleScreen}
          disabled={busy}
          title="Toggle Screen Share"
        >
          {screenOn ? <Monitor size={16} /> : <MonitorOff size={16} />}
          <span>{screenOn ? 'screen on' : 'share screen'}</span>
        </button>
      </div>
    </div>
  )
}

export default function StreamBroadcast({ streamKey, onEnd }) {
  const [token, setToken] = useState(null)
  const [wsUrl, setWsUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function getToken() {
      try {
        const res = await fetch(`${BACKEND}/api/livekit/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamKey,
            identity: `streamer_${streamKey}`,
            isStreamer: true
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setToken(json.token)
        setWsUrl(json.wsUrl)
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    }
    getToken()
  }, [streamKey])

  if (loading) return (
    <div className="broadcast-loading">
      <Loader size={16} className="spin-icon" />
      <span>connecting to LiveKit...</span>
    </div>
  )

  if (error) return (
    <div className="broadcast-error">
      ⚠ {error}
      <span>Make sure LIVEKIT_API_KEY and LIVEKIT_WS_URL are set in backend .env</span>
    </div>
  )

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={false}
      audio={false}
      className="broadcast-room"
    >
      <BroadcastControls onEnd={onEnd} />
    </LiveKitRoom>
  )
}
