import { useRef, useEffect, useState, useCallback, type CSSProperties } from 'react'

interface FlappyBirdProps {
  onBack: () => void
  onScoreUpdate: (score: number) => void
  highScore: number
}

const CANVAS_W = 480
const CANVAS_H = 640
const GRAVITY = 0.45
const FLAP_FORCE = -7.5
const PIPE_WIDTH = 60
const PIPE_GAP = 160
const PIPE_SPEED = 2.5
const PIPE_INTERVAL = 100
const BIRD_SIZE = 28
const GROUND_H = 60

interface Bird {
  x: number
  y: number
  vy: number
  rotation: number
}

interface Pipe {
  x: number
  topH: number
  scored: boolean
}

type GameState = 'idle' | 'playing' | 'dead'

export default function FlappyBird({ onBack, onScoreUpdate, highScore }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const birdRef = useRef<Bird>({ x: 120, y: CANVAS_H / 2, vy: 0, rotation: 0 })
  const pipesRef = useRef<Pipe[]>([])
  const scoreRef = useRef(0)
  const frameCountRef = useRef(0)
  const stateRef = useRef<GameState>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')

  const resetGame = useCallback(() => {
    birdRef.current = { x: 120, y: CANVAS_H / 2, vy: 0, rotation: 0 }
    pipesRef.current = []
    scoreRef.current = 0
    frameCountRef.current = 0
    setDisplayScore(0)
  }, [])

  const flap = useCallback(() => {
    if (stateRef.current === 'dead') {
      resetGame()
      stateRef.current = 'playing'
      setGameState('playing')
      return
    }
    if (stateRef.current === 'idle') {
      stateRef.current = 'playing'
      setGameState('playing')
    }
    birdRef.current.vy = FLAP_FORCE
  }, [resetGame])

  const drawBird = useCallback((ctx: CanvasRenderingContext2D, bird: Bird) => {
    ctx.save()
    ctx.translate(bird.x, bird.y)
    ctx.rotate(Math.min(bird.rotation, Math.PI / 4))

    // Body
    ctx.fillStyle = '#f1c40f'
    ctx.beginPath()
    ctx.ellipse(0, 0, BIRD_SIZE, BIRD_SIZE * 0.75, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e67e22'
    ctx.lineWidth = 2
    ctx.stroke()

    // Wing
    ctx.fillStyle = '#f39c12'
    ctx.beginPath()
    ctx.ellipse(-6, 2, BIRD_SIZE * 0.5, BIRD_SIZE * 0.35, -0.3, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(10, -6, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2c3e50'
    ctx.beginPath()
    ctx.arc(12, -6, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Beak
    ctx.fillStyle = '#e74c3c'
    ctx.beginPath()
    ctx.moveTo(BIRD_SIZE - 4, -2)
    ctx.lineTo(BIRD_SIZE + 10, 2)
    ctx.lineTo(BIRD_SIZE - 4, 6)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }, [])

  const drawPipe = useCallback((ctx: CanvasRenderingContext2D, pipe: Pipe) => {
    const bottomY = pipe.topH + PIPE_GAP

    // Top pipe
    const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0)
    topGrad.addColorStop(0, '#27ae60')
    topGrad.addColorStop(0.5, '#2ecc71')
    topGrad.addColorStop(1, '#27ae60')
    ctx.fillStyle = topGrad
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH)

    // Top pipe cap
    ctx.fillStyle = '#219a52'
    ctx.fillRect(pipe.x - 4, pipe.topH - 24, PIPE_WIDTH + 8, 24)
    ctx.strokeStyle = '#1a7a3f'
    ctx.lineWidth = 2
    ctx.strokeRect(pipe.x - 4, pipe.topH - 24, PIPE_WIDTH + 8, 24)

    // Bottom pipe
    ctx.fillStyle = topGrad
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_H - bottomY - GROUND_H)

    // Bottom pipe cap
    ctx.fillStyle = '#219a52'
    ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 24)
    ctx.strokeStyle = '#1a7a3f'
    ctx.strokeRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 24)
  }, [])

  const drawGround = useCallback((ctx: CanvasRenderingContext2D) => {
    const groundY = CANVAS_H - GROUND_H
    ctx.fillStyle = '#c4a265'
    ctx.fillRect(0, groundY, CANVAS_W, GROUND_H)
    ctx.fillStyle = '#8b6914'
    ctx.fillRect(0, groundY, CANVAS_W, 4)

    // Ground pattern
    ctx.fillStyle = '#a08040'
    for (let i = 0; i < CANVAS_W; i += 24) {
      ctx.fillRect(i, groundY + 10, 12, 3)
      ctx.fillRect(i + 12, groundY + 20, 12, 3)
    }
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H - GROUND_H)
    skyGrad.addColorStop(0, '#4FC3F7')
    skyGrad.addColorStop(1, '#81D4FA')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    const drawCloud = (cx: number, cy: number, scale: number) => {
      ctx.beginPath()
      ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2)
      ctx.arc(cx + 15 * scale, cy - 8 * scale, 15 * scale, 0, Math.PI * 2)
      ctx.arc(cx + 30 * scale, cy, 18 * scale, 0, Math.PI * 2)
      ctx.arc(cx + 15 * scale, cy + 5 * scale, 14 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    drawCloud(80, 100, 1.2)
    drawCloud(280, 60, 1)
    drawCloud(400, 130, 0.8)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gameLoop = () => {
      const bird = birdRef.current
      const pipes = pipesRef.current
      const state = stateRef.current

      // Update
      if (state === 'playing') {
        bird.vy += GRAVITY
        bird.y += bird.vy
        bird.rotation = Math.atan2(bird.vy, 10)

        frameCountRef.current++
        if (frameCountRef.current % PIPE_INTERVAL === 0) {
          const topH = 80 + Math.random() * (CANVAS_H - PIPE_GAP - GROUND_H - 160)
          pipes.push({ x: CANVAS_W, topH, scored: false })
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
          pipes[i].x -= PIPE_SPEED

          if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
            pipes[i].scored = true
            scoreRef.current++
            setDisplayScore(scoreRef.current)
            onScoreUpdate(scoreRef.current)
          }

          if (pipes[i].x + PIPE_WIDTH < -10) {
            pipes.splice(i, 1)
          }
        }

        // Collision detection
        const birdLeft = bird.x - BIRD_SIZE + 6
        const birdRight = bird.x + BIRD_SIZE - 6
        const birdTop = bird.y - BIRD_SIZE * 0.65
        const birdBottom = bird.y + BIRD_SIZE * 0.65

        if (birdBottom >= CANVAS_H - GROUND_H || birdTop <= 0) {
          stateRef.current = 'dead'
          setGameState('dead')
        }

        for (const pipe of pipes) {
          if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
            if (birdTop < pipe.topH || birdBottom > pipe.topH + PIPE_GAP) {
              stateRef.current = 'dead'
              setGameState('dead')
              break
            }
          }
        }
      } else if (state === 'idle') {
        bird.y = CANVAS_H / 2 + Math.sin(Date.now() / 300) * 15
      }

      // Draw
      drawBackground(ctx)
      pipes.forEach(p => drawPipe(ctx, p))
      drawGround(ctx)
      drawBird(ctx, bird)

      // UI overlays
      if (state === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        ctx.font = '28px "Press Start 2P"'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText('FLAPPY BIRD', CANVAS_W / 2, CANVAS_H / 2 - 60)

        ctx.font = '12px "Press Start 2P"'
        ctx.fillStyle = '#f1c40f'
        ctx.fillText('CLICK OR PRESS SPACE', CANVAS_W / 2, CANVAS_H / 2 + 10)
        ctx.fillText('TO START', CANVAS_W / 2, CANVAS_H / 2 + 35)
      }

      if (state === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        ctx.font = '24px "Press Start 2P"'
        ctx.fillStyle = '#e74c3c'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 50)

        ctx.font = '16px "Press Start 2P"'
        ctx.fillStyle = '#f1c40f'
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2)

        ctx.font = '14px "Press Start 2P"'
        ctx.fillStyle = '#fff'
        ctx.fillText(`Best: ${Math.max(highScore, scoreRef.current)}`, CANVAS_W / 2, CANVAS_H / 2 + 30)

        ctx.font = '10px "Press Start 2P"'
        ctx.fillStyle = '#a29bfe'
        ctx.fillText('CLICK TO RETRY', CANVAS_W / 2, CANVAS_H / 2 + 70)
      }

      // Score display during play
      if (state === 'playing') {
        ctx.font = '24px "Press Start 2P"'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 4
        ctx.strokeText(String(scoreRef.current), CANVAS_W / 2, 50)
        ctx.fillText(String(scoreRef.current), CANVAS_W / 2, 50)
      }

      frameRef.current = requestAnimationFrame(gameLoop)
    }

    frameRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [drawBackground, drawBird, drawGround, drawPipe, highScore, onScoreUpdate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        flap()
      }
      if (e.code === 'Escape') {
        onBack()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flap, onBack])

  const wrapper: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '16px',
    animation: 'fade-in 0.4s ease',
  }

  const canvasStyle: CSSProperties = {
    borderRadius: '12px',
    boxShadow: '0 0 40px rgba(108, 92, 231, 0.3)',
    cursor: 'pointer',
  }

  const info: CSSProperties = {
    display: 'flex',
    gap: '24px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  }

  return (
    <div style={wrapper}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={canvasStyle}
        onClick={flap}
      />
      <div style={info}>
        <span>🏆 High Score: <strong style={{ color: 'var(--warning)' }}>{Math.max(highScore, displayScore)}</strong></span>
        <span>🎮 Score: <strong style={{ color: '#fff' }}>{displayScore}</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>
          {gameState === 'idle' && '⏳ Ready'}
          {gameState === 'playing' && '🔥 Playing'}
          {gameState === 'dead' && '💀 Game Over'}
        </span>
      </div>
    </div>
  )
}
