import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import './StreamGoal.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function StreamGoal({ streamId, currentViewers }) {
  const [goal, setGoal] = useState(null)

  useEffect(() => {
    if (!streamId) return
    fetch(`${BACKEND}/api/goals/${streamId}`)
      .then(r => r.json())
      .then(data => { if (data?.id) setGoal(data) })
  }, [streamId])

  if (!goal) return null

  const progress = Math.min(100, Math.round((currentViewers / goal.target_viewers) * 100))
  const achieved = currentViewers >= goal.target_viewers

  return (
    <div className={`stream-goal ${achieved ? 'achieved' : ''}`}>
      <div className="goal-header">
        <Target size={13} />
        <span className="goal-title">{goal.title}</span>
        <span className="goal-count">{currentViewers}/{goal.target_viewers}</span>
      </div>
      <div className="goal-bar">
        <div className="goal-fill" style={{ width: `${progress}%` }} />
      </div>
      {achieved && <div className="goal-achieved">🎉 Goal reached!</div>}
    </div>
  )
}
