import { useState, useCallback } from 'react'
import Navbar from './components/Navbar'
import GameHub from './components/GameHub'
import FlappyBird from './games/FlappyBird'
import MarioGame from './games/MarioGame'

type Screen = 'hub' | 'flappy-bird' | 'mario'

function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [scores, setScores] = useState<Record<string, number>>({
    'flappy-bird': 0,
    'mario': 0,
  })

  const handleNavigate = useCallback((target: Screen) => {
    setScreen(target)
  }, [])

  const handleScoreUpdate = useCallback((game: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [game]: Math.max(prev[game] ?? 0, score),
    }))
  }, [])

  const handleBack = useCallback(() => {
    setScreen('hub')
  }, [])

  return (
    <>
      <Navbar onHome={handleBack} currentScreen={screen} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'hub' && (
          <GameHub
            onSelectGame={handleNavigate}
            highScores={scores}
          />
        )}
        {screen === 'flappy-bird' && (
          <FlappyBird
            onBack={handleBack}
            onScoreUpdate={(s) => handleScoreUpdate('flappy-bird', s)}
            highScore={scores['flappy-bird']}
          />
        )}
        {screen === 'mario' && (
          <MarioGame
            onBack={handleBack}
            onScoreUpdate={(s) => handleScoreUpdate('mario', s)}
            highScore={scores['mario']}
          />
        )}
      </main>
    </>
  )
}

export default App
