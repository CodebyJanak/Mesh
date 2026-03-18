import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Radio, Users, Compass, Search, X } from 'lucide-react'
import './Discover.css'

const CATEGORIES = ['All', 'Development', 'Gaming', 'Education', 'Events', 'Music', 'Talk', 'General']

export default function Discover() {
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimeout = useRef(null)

  useEffect(() => {
    fetchLiveStreams()
    const interval = setInterval(fetchLiveStreams, 15000)
    return () => clearInterval(interval)
  }, [activeCategory, search])

  const fetchLiveStreams = async () => {
    let query = supabase
      .from('streams').select('*, profiles(username)').eq('is_live', true)
      .order('peak_viewers', { ascending: false })
    if (activeCategory !== 'All') query = query.eq('category', activeCategory)
    if (search) query = query.ilike('title', `%${search}%`)
    const { data, error } = await query
    if (!error) setStreams(data || [])
    setLoading(false)
  }

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearch(e.target.value), 400)
  }

  const clearSearch = () => { setSearchInput(''); setSearch('') }

  return (
    <div className="discover">
      <div className="discover-header fade-up">
        <div className="discover-title-row">
          <Compass size={22} />
          <h1>live streams</h1>
          {streams.length > 0 && (
            <div className="live-count-badge"><span className="live-dot" />{streams.length} live</div>
          )}
        </div>
        <p>Discover and watch live streams happening right now</p>
      </div>

      {/* Search bar */}
      <div className="search-bar fade-up fade-up-1">
        <Search size={15} className="search-icon" />
        <input
          type="text" placeholder="search streams..."
          value={searchInput} onChange={handleSearchChange}
        />
        {searchInput && (
          <button className="search-clear" onClick={clearSearch}><X size={13} /></button>
        )}
      </div>

      <div className="category-filter fade-up fade-up-1">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}>{cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="discover-loading"><Radio size={20} className="spin-icon" /><span>scanning for live streams...</span></div>
      ) : streams.length === 0 ? (
        <div className="no-streams fade-up">
          <div className="no-streams-icon"><Radio size={32} /></div>
          <h3>{search ? `No results for "${search}"` : 'No live streams'}</h3>
          <p>{search ? 'Try a different search term.' : activeCategory !== 'All' ? `No live streams in ${activeCategory} right now.` : 'Nobody is streaming right now. Be the first!'}</p>
          <Link to="/register" className="cta-go-live">start streaming</Link>
        </div>
      ) : (
        <div className="streams-grid fade-up fade-up-2">
          {streams.map((stream, i) => (
            <Link key={stream.id} to={`/stream/${stream.stream_key}`} className="stream-card"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stream-thumb">
                {stream.thumbnail_url
                  ? <img src={stream.thumbnail_url} alt={stream.title} className="stream-thumb-img" onError={e => e.target.style.display='none'} />
                  : <div className="thumb-placeholder"><Radio size={28} /></div>
                }
                <div className="thumb-live-badge"><span className="live-dot" />LIVE</div>
                {stream.peak_viewers > 0 && (
                  <div className="thumb-peak"><Users size={10} />{stream.peak_viewers}</div>
                )}
              </div>
              <div className="stream-info">
                <div className="stream-card-title">{stream.title}</div>
                <div className="stream-card-meta">
                  <span className="streamer-name">@{stream.profiles?.username || 'streamer'}</span>
                  <span className="dot-sep">·</span>
                  <span className="stream-category">{stream.category}</span>
                </div>
                <div className="viewer-row"><Users size={12} /><span>{stream.peak_viewers || 0} viewers</span></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
