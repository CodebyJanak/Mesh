import { Link } from 'react-router-dom'
import { Radio, Zap, Link2, BarChart2, ArrowRight, Shield, Globe } from 'lucide-react'
import './Home.css'

export default function Home() {
  return (
    <div className="home">
      <div className="home-grid" />
      <div className="home-orb home-orb-1" />
      <div className="home-orb home-orb-2" />

      <section className="hero">
        <div className="hero-eyebrow fade-up">
          <span className="hero-eyebrow-dot" />
          open source · self-hostable · free
        </div>

        <h1 className="hero-title fade-up fade-up-1">
          Stream live.<br />
          <span className="line-2">Share instantly.</span><br />
          <span className="accent-word">No limits.</span>
        </h1>

        <p className="hero-sub fade-up fade-up-2">
          Mesh is a real-time streaming platform built for developers, educators
          and creators. Go live in seconds — no accounts required for viewers.
        </p>

        <div className="hero-actions fade-up fade-up-3">
          <Link to="/register" className="cta-primary">
            <Radio size={16} />
            start streaming free
            <ArrowRight size={15} />
          </Link>
          <Link to="/discover" className="cta-secondary">
            watch live streams
          </Link>
        </div>

        <div className="hero-stats fade-up fade-up-4">
          <div className="stat-item">
            <span className="stat-num">0ms</span>
            <span className="stat-label">setup time</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">∞</span>
            <span className="stat-label">viewers</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">100%</span>
            <span className="stat-label">free forever</span>
          </div>
        </div>
      </section>

      <section className="features-section">
        <p className="features-heading fade-up">everything you need</p>
        <div className="features-grid">
          {[
            { icon: <Zap size={20} />, title: 'Instant Stream', desc: 'Start broadcasting in seconds from your browser. Camera, mic, or screen — your choice.' },
            { icon: <Link2 size={20} />, title: 'Shareable Link', desc: 'Every stream gets a unique public URL. Share anywhere. No account needed to watch.' },
            { icon: <BarChart2 size={20} />, title: 'Live Analytics', desc: 'Real-time viewer counts, peak stats, and stream duration — all updating live.' },
            { icon: <Shield size={20} />, title: 'Chat Moderation', desc: 'Delete messages and ban users from your stream chat instantly.' },
            { icon: <Globe size={20} />, title: 'Public Discovery', desc: 'Your stream appears on the public discover page. Search by title or category.' },
            { icon: <Radio size={20} />, title: 'OBS Support', desc: 'Stream using OBS or any RTMP software with your unique stream key.' },
          ].map((f, i) => (
            <div key={i} className={`feature-card fade-up fade-up-${(i % 4) + 1}`}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
