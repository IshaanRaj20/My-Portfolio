import type { CSSProperties } from 'react'

interface NavbarProps {
  onHome: () => void
  currentScreen: string
}

const styles: Record<string, CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    background: 'rgba(10, 10, 26, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'var(--gradient-1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    letterSpacing: '2px',
    background: 'var(--gradient-1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  breadcrumb: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  backBtn: {
    padding: '8px 20px',
    background: 'rgba(108, 92, 231, 0.15)',
    border: '1px solid rgba(108, 92, 231, 0.3)',
    borderRadius: '8px',
    color: 'var(--accent-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
}

const gameNames: Record<string, string> = {
  'flappy-bird': 'Flappy Bird',
  'mario': 'Super Mario',
}

export default function Navbar({ onHome, currentScreen }: NavbarProps) {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={onHome}>
        <div style={styles.logoIcon}>🕹️</div>
        <span style={styles.logoText}>ARCADE ZONE</span>
      </div>

      {currentScreen !== 'hub' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={styles.breadcrumb}>
            <span style={{ opacity: 0.5 }}>Games</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {gameNames[currentScreen] ?? currentScreen}
            </span>
          </span>
          <button
            style={styles.backBtn}
            onClick={onHome}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(108, 92, 231, 0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(108, 92, 231, 0.15)'
            }}
          >
            ← Back to Hub
          </button>
        </div>
      )}
    </nav>
  )
}
