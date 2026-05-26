import { useState, type CSSProperties } from 'react'

interface GameCardProps {
  title: string
  description: string
  gradient: string
  emoji: string
  controls: string
  difficulty: string
  highScore: number
  onClick: () => void
  delay: number
}

export default function GameCard({
  title,
  description,
  gradient,
  emoji,
  controls,
  difficulty,
  highScore,
  onClick,
  delay,
}: GameCardProps) {
  const [hovered, setHovered] = useState(false)

  const card: CSSProperties = {
    background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
    borderRadius: '16px',
    border: `1px solid ${hovered ? 'rgba(108, 92, 231, 0.4)' : 'var(--border)'}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hovered
      ? '0 20px 60px rgba(108, 92, 231, 0.2)'
      : '0 4px 20px rgba(0, 0, 0, 0.2)',
    animation: `slide-up 0.5s ease ${delay}s both`,
  }

  const banner: CSSProperties = {
    height: '160px',
    background: gradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    position: 'relative',
    overflow: 'hidden',
  }

  const bannerOverlay: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const body: CSSProperties = {
    padding: '24px',
  }

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    marginBottom: '10px',
    color: 'var(--text-primary)',
  }

  const descStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginBottom: '20px',
  }

  const meta: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid var(--border)',
  }

  const badge: CSSProperties = {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'rgba(108, 92, 231, 0.15)',
    color: 'var(--accent-secondary)',
  }

  const scoreBadge: CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-muted)',
  }

  const playBtn: CSSProperties = {
    width: '100%',
    padding: '14px',
    background: hovered ? gradient : 'rgba(255,255,255,0.05)',
    color: hovered ? '#fff' : 'var(--text-secondary)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    letterSpacing: '2px',
    transition: 'all 0.3s ease',
    marginTop: '16px',
    border: 'none',
  }

  return (
    <div
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={banner}>
        <div style={bannerOverlay}>
          <span style={{ fontSize: '64px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
            {emoji}
          </span>
        </div>
      </div>
      <div style={body}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={descStyle}>{description}</p>
        <div style={meta}>
          <span style={badge}>{difficulty}</span>
          <span style={scoreBadge}>🎮 {controls}</span>
        </div>
        {highScore > 0 && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--warning)' }}>
            🏆 High Score: {highScore}
          </div>
        )}
        <button style={playBtn}>
          {hovered ? 'PLAY NOW' : 'SELECT'}
        </button>
      </div>
    </div>
  )
}
