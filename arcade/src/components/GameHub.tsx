import type { CSSProperties } from 'react'
import GameCard from './GameCard'

interface GameHubProps {
  onSelectGame: (game: 'flappy-bird' | 'mario') => void
  highScores: Record<string, number>
}

const styles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    padding: '0 32px 60px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  hero: {
    textAlign: 'center',
    padding: '80px 0 60px',
    animation: 'fade-in 0.6s ease',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    lineHeight: 1.6,
    marginBottom: '16px',
    background: 'var(--gradient-1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    letterSpacing: '3px',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-secondary)',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    padding: '40px 0',
    marginBottom: '40px',
    animation: 'slide-up 0.6s ease 0.2s both',
  },
  statItem: {
    textAlign: 'center',
  },
  statNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    color: 'var(--accent-secondary)',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
}

const games = [
  {
    id: 'flappy-bird' as const,
    title: 'Flappy Bird',
    description: 'Tap to fly through the pipes! How far can you go without crashing? A test of timing and reflexes.',
    gradient: 'linear-gradient(135deg, #00b894, #55efc4)',
    emoji: '🐦',
    controls: 'Space / Click to flap',
    difficulty: 'Medium',
  },
  {
    id: 'mario' as const,
    title: 'Super Mario Run',
    description: 'Jump over obstacles, stomp enemies, and collect coins in this classic side-scrolling platformer adventure!',
    gradient: 'linear-gradient(135deg, #e74c3c, #fd79a8)',
    emoji: '🍄',
    controls: 'Arrow Keys / WASD',
    difficulty: 'Medium',
  },
]

export default function GameHub({ onSelectGame, highScores }: GameHubProps) {
  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to Arcade Zone</h1>
        <p style={styles.heroSubtitle}>
          Play classic retro games right in your browser. Challenge yourself,
          beat high scores, and have fun!
        </p>
      </div>

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{games.length}</div>
          <div style={styles.statLabel}>Games</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>∞</div>
          <div style={styles.statLabel}>Fun</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>0</div>
          <div style={styles.statLabel}>Cost</div>
        </div>
      </div>

      <div style={styles.sectionTitle}>
        <span>Featured Games</span>
        <div style={styles.sectionLine} />
      </div>

      <div style={styles.grid}>
        {games.map((game, i) => (
          <GameCard
            key={game.id}
            title={game.title}
            description={game.description}
            gradient={game.gradient}
            emoji={game.emoji}
            controls={game.controls}
            difficulty={game.difficulty}
            highScore={highScores[game.id] ?? 0}
            onClick={() => onSelectGame(game.id)}
            delay={i * 0.1}
          />
        ))}
      </div>
    </div>
  )
}
