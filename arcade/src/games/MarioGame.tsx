import { useRef, useEffect, useState, useCallback, type CSSProperties } from 'react'

interface MarioGameProps {
  onBack: () => void
  onScoreUpdate: (score: number) => void
  highScore: number
}

const CANVAS_W = 800
const CANVAS_H = 480
const GRAVITY = 0.6
const JUMP_FORCE = -12
const MOVE_SPEED = 4
const GROUND_Y = CANVAS_H - 64
const PLAYER_W = 32
const PLAYER_H = 40
const SCROLL_SPEED = 2.5
const COIN_SIZE = 16

interface Player {
  x: number
  y: number
  vy: number
  vx: number
  onGround: boolean
  facing: 1 | -1
  frame: number
}

interface Platform {
  x: number
  y: number
  w: number
  type: 'ground' | 'brick' | 'question'
  coins?: number
  hit?: boolean
}

interface Enemy {
  x: number
  y: number
  vy: number
  vx: number
  type: 'goomba' | 'koopa'
  alive: boolean
  frame: number
}

interface Coin {
  x: number
  y: number
  collected: boolean
  floatOffset: number
}

type GameState = 'idle' | 'playing' | 'dead'

function generateLevel(): { platforms: Platform[]; enemies: Enemy[]; coins: Coin[] } {
  const platforms: Platform[] = []
  const enemies: Enemy[] = []
  const coins: Coin[] = []

  // Ground sections
  for (let x = 0; x < 6000; x += 200) {
    const hasGap = x > 400 && Math.random() < 0.15
    if (!hasGap) {
      platforms.push({ x, y: GROUND_Y, w: 200, type: 'ground' })
    }
  }

  // Floating platforms with question blocks
  for (let i = 0; i < 30; i++) {
    const px = 300 + i * 200 + Math.random() * 80
    const py = GROUND_Y - 100 - Math.random() * 80
    const isQuestion = Math.random() < 0.4
    platforms.push({
      x: px,
      y: py,
      w: isQuestion ? 32 : 64 + Math.random() * 64,
      type: isQuestion ? 'question' : 'brick',
      coins: isQuestion ? 1 : 0,
    })

    // Coins above platforms
    if (Math.random() < 0.6) {
      for (let c = 0; c < 3; c++) {
        coins.push({
          x: px + c * 24,
          y: py - 30,
          collected: false,
          floatOffset: Math.random() * Math.PI * 2,
        })
      }
    }
  }

  // Ground-level coin trails
  for (let i = 0; i < 20; i++) {
    const cx = 200 + i * 280 + Math.random() * 100
    for (let c = 0; c < 5; c++) {
      coins.push({
        x: cx + c * 22,
        y: GROUND_Y - 40,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2,
      })
    }
  }

  // Enemies
  for (let i = 0; i < 20; i++) {
    const ex = 500 + i * 300 + Math.random() * 100
    enemies.push({
      x: ex,
      y: GROUND_Y - 28,
      vy: 0,
      vx: -1,
      type: Math.random() < 0.7 ? 'goomba' : 'koopa',
      alive: true,
      frame: 0,
    })
  }

  return { platforms, enemies, coins }
}

export default function MarioGame({ onBack, onScoreUpdate, highScore }: MarioGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const playerRef = useRef<Player>({
    x: 80, y: GROUND_Y - PLAYER_H, vy: 0, vx: 0, onGround: true, facing: 1, frame: 0,
  })
  const levelRef = useRef(generateLevel())
  const cameraRef = useRef(0)
  const scoreRef = useRef(0)
  const keysRef = useRef<Set<string>>(new Set())
  const stateRef = useRef<GameState>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')

  const resetGame = useCallback(() => {
    playerRef.current = {
      x: 80, y: GROUND_Y - PLAYER_H, vy: 0, vx: 0, onGround: true, facing: 1, frame: 0,
    }
    levelRef.current = generateLevel()
    cameraRef.current = 0
    scoreRef.current = 0
    setDisplayScore(0)
  }, [])

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, p: Player, camX: number) => {
    const sx = p.x - camX
    const sy = p.y
    ctx.save()
    ctx.translate(sx + PLAYER_W / 2, sy + PLAYER_H / 2)
    ctx.scale(p.facing, 1)
    ctx.translate(-PLAYER_W / 2, -PLAYER_H / 2)

    // Hat
    ctx.fillStyle = '#e74c3c'
    ctx.fillRect(2, 0, PLAYER_W - 4, 10)
    ctx.fillRect(-2, 6, PLAYER_W + 2, 6)

    // Face
    ctx.fillStyle = '#f5cba7'
    ctx.fillRect(4, 10, PLAYER_W - 8, 12)

    // Eyes
    ctx.fillStyle = '#2c3e50'
    ctx.fillRect(8, 13, 4, 4)

    // Mustache
    ctx.fillStyle = '#5d4037'
    ctx.fillRect(6, 19, PLAYER_W - 12, 3)

    // Body (overalls)
    ctx.fillStyle = '#3498db'
    ctx.fillRect(4, 22, PLAYER_W - 8, 12)

    // Overall buttons
    ctx.fillStyle = '#f1c40f'
    ctx.fillRect(10, 24, 3, 3)
    ctx.fillRect(PLAYER_W - 13, 24, 3, 3)

    // Legs
    const legOffset = p.onGround && Math.abs(p.vx) > 0.5
      ? Math.sin(p.frame * 0.3) * 3 : 0
    ctx.fillStyle = '#3498db'
    ctx.fillRect(4, 34, 10, 6 + legOffset)
    ctx.fillRect(PLAYER_W - 14, 34, 10, 6 - legOffset)

    // Shoes
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(2, 38 + legOffset, 12, 4)
    ctx.fillRect(PLAYER_W - 14, 38 - legOffset, 12, 4)

    ctx.restore()
  }, [])

  const drawPlatform = useCallback((ctx: CanvasRenderingContext2D, plat: Platform, camX: number) => {
    const sx = plat.x - camX

    if (plat.type === 'ground') {
      ctx.fillStyle = '#8b6914'
      ctx.fillRect(sx, plat.y, plat.w, 64)
      ctx.fillStyle = '#27ae60'
      ctx.fillRect(sx, plat.y, plat.w, 8)
      ctx.fillStyle = '#6d4c0a'
      for (let i = 0; i < plat.w; i += 32) {
        ctx.strokeStyle = '#5a3d08'
        ctx.lineWidth = 1
        ctx.strokeRect(sx + i, plat.y + 8, 32, 28)
        ctx.strokeRect(sx + i + 16, plat.y + 36, 32, 28)
      }
    } else if (plat.type === 'brick') {
      ctx.fillStyle = '#c0392b'
      ctx.fillRect(sx, plat.y, plat.w, 32)
      ctx.strokeStyle = '#922b21'
      ctx.lineWidth = 1
      for (let i = 0; i < plat.w; i += 16) {
        ctx.strokeRect(sx + i, plat.y, 16, 16)
        ctx.strokeRect(sx + i + 8, plat.y + 16, 16, 16)
      }
    } else if (plat.type === 'question') {
      ctx.fillStyle = plat.hit ? '#8b6914' : '#f39c12'
      ctx.fillRect(sx, plat.y, 32, 32)
      ctx.strokeStyle = plat.hit ? '#5a3d08' : '#e67e22'
      ctx.lineWidth = 2
      ctx.strokeRect(sx, plat.y, 32, 32)
      if (!plat.hit) {
        ctx.font = 'bold 16px "Press Start 2P"'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText('?', sx + 16, plat.y + 22)
      }
    }
  }, [])

  const drawEnemy = useCallback((ctx: CanvasRenderingContext2D, e: Enemy, camX: number) => {
    if (!e.alive) return
    const sx = e.x - camX

    if (e.type === 'goomba') {
      // Body
      ctx.fillStyle = '#8b4513'
      ctx.beginPath()
      ctx.arc(sx + 14, e.y + 14, 14, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(sx, e.y + 14, 28, 14)

      // Eyes
      ctx.fillStyle = '#fff'
      ctx.fillRect(sx + 6, e.y + 10, 5, 6)
      ctx.fillRect(sx + 17, e.y + 10, 5, 6)
      ctx.fillStyle = '#000'
      ctx.fillRect(sx + 8, e.y + 12, 3, 4)
      ctx.fillRect(sx + 19, e.y + 12, 3, 4)

      // Feet
      const footOffset = Math.sin(e.frame * 0.15) * 2
      ctx.fillStyle = '#5d4037'
      ctx.fillRect(sx - 2, e.y + 24 + footOffset, 12, 6)
      ctx.fillRect(sx + 18, e.y + 24 - footOffset, 12, 6)
    } else {
      // Koopa shell
      ctx.fillStyle = '#27ae60'
      ctx.beginPath()
      ctx.ellipse(sx + 14, e.y + 12, 14, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f5cba7'
      ctx.fillRect(sx + 6, e.y - 4, 8, 8)
      ctx.fillStyle = '#000'
      ctx.fillRect(sx + 10, e.y - 2, 3, 3)
    }
  }, [])

  const drawCoin = useCallback((ctx: CanvasRenderingContext2D, coin: Coin, camX: number) => {
    if (coin.collected) return
    const sx = coin.x - camX
    const floatY = coin.y + Math.sin(Date.now() / 400 + coin.floatOffset) * 4

    ctx.fillStyle = '#f1c40f'
    ctx.beginPath()
    ctx.ellipse(sx + COIN_SIZE / 2, floatY + COIN_SIZE / 2, COIN_SIZE / 2, COIN_SIZE / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e67e22'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#e67e22'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('$', sx + COIN_SIZE / 2, floatY + COIN_SIZE / 2 + 4)
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, camX: number) => {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    skyGrad.addColorStop(0, '#87CEEB')
    skyGrad.addColorStop(0.7, '#B0E0E6')
    skyGrad.addColorStop(1, '#98D8C8')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Hills (parallax)
    ctx.fillStyle = '#6ab04c'
    for (let i = 0; i < 8; i++) {
      const hx = i * 300 - (camX * 0.3) % 300
      ctx.beginPath()
      ctx.arc(hx, CANVAS_H - 30, 120, Math.PI, 0)
      ctx.fill()
    }

    // Bushes
    ctx.fillStyle = '#2d8a4e'
    for (let i = 0; i < 12; i++) {
      const bx = i * 220 - (camX * 0.5) % 220
      ctx.beginPath()
      ctx.arc(bx, CANVAS_H - 50, 30, Math.PI, 0)
      ctx.arc(bx + 25, CANVAS_H - 50, 25, Math.PI, 0)
      ctx.arc(bx + 50, CANVAS_H - 50, 30, Math.PI, 0)
      ctx.fill()
    }

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (let i = 0; i < 6; i++) {
      const cx = i * 350 - (camX * 0.1) % 350
      const cy = 40 + (i % 3) * 40
      ctx.beginPath()
      ctx.arc(cx, cy, 20, 0, Math.PI * 2)
      ctx.arc(cx + 20, cy - 10, 18, 0, Math.PI * 2)
      ctx.arc(cx + 35, cy, 22, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gameLoop = () => {
      const player = playerRef.current
      const level = levelRef.current
      const keys = keysRef.current
      const state = stateRef.current

      if (state === 'playing') {
        // Input
        player.vx = 0
        if (keys.has('ArrowRight') || keys.has('KeyD')) {
          player.vx = MOVE_SPEED
          player.facing = 1
        }
        if (keys.has('ArrowLeft') || keys.has('KeyA')) {
          player.vx = -MOVE_SPEED
          player.facing = -1
        }
        if ((keys.has('ArrowUp') || keys.has('KeyW') || keys.has('Space')) && player.onGround) {
          player.vy = JUMP_FORCE
          player.onGround = false
        }

        // Physics
        player.vy += GRAVITY
        player.x += player.vx
        player.y += player.vy
        player.frame++

        // Platform collision
        player.onGround = false
        for (const plat of level.platforms) {
          const platTop = plat.type === 'ground' ? plat.y : plat.y
          const platH = plat.type === 'ground' ? 64 : 32
          const playerBottom = player.y + PLAYER_H
          const playerRight = player.x + PLAYER_W
          const playerLeft = player.x

          // Landing on top
          if (
            playerRight > plat.x &&
            playerLeft < plat.x + plat.w &&
            playerBottom >= platTop &&
            playerBottom <= platTop + 16 &&
            player.vy >= 0
          ) {
            player.y = platTop - PLAYER_H
            player.vy = 0
            player.onGround = true
          }

          // Hitting from below (question blocks)
          if (
            plat.type === 'question' && !plat.hit &&
            playerRight > plat.x &&
            playerLeft < plat.x + plat.w &&
            player.y <= platTop + platH &&
            player.y >= platTop + platH - 8 &&
            player.vy < 0
          ) {
            plat.hit = true
            scoreRef.current += 100
            setDisplayScore(scoreRef.current)
            onScoreUpdate(scoreRef.current)
          }
        }

        // Coin collection
        for (const coin of level.coins) {
          if (coin.collected) continue
          const dx = (player.x + PLAYER_W / 2) - (coin.x + COIN_SIZE / 2)
          const dy = (player.y + PLAYER_H / 2) - (coin.y + COIN_SIZE / 2)
          if (Math.sqrt(dx * dx + dy * dy) < 24) {
            coin.collected = true
            scoreRef.current += 50
            setDisplayScore(scoreRef.current)
            onScoreUpdate(scoreRef.current)
          }
        }

        // Enemy updates & collision
        for (const enemy of level.enemies) {
          if (!enemy.alive) continue
          enemy.x += enemy.vx
          enemy.frame++

          // Check platform edges for enemies
          let onPlatform = false
          for (const plat of level.platforms) {
            if (
              enemy.x + 28 > plat.x &&
              enemy.x < plat.x + plat.w &&
              enemy.y + 28 >= plat.y &&
              enemy.y + 28 <= plat.y + 8
            ) {
              onPlatform = true
            }
          }
          if (!onPlatform) {
            enemy.vx *= -1
          }

          // Player-enemy collision
          const dx = (player.x + PLAYER_W / 2) - (enemy.x + 14)
          const dy = (player.y + PLAYER_H / 2) - (enemy.y + 14)
          if (Math.abs(dx) < 28 && Math.abs(dy) < 30) {
            if (player.vy > 0 && player.y + PLAYER_H < enemy.y + 20) {
              enemy.alive = false
              player.vy = -8
              scoreRef.current += 200
              setDisplayScore(scoreRef.current)
              onScoreUpdate(scoreRef.current)
            } else {
              stateRef.current = 'dead'
              setGameState('dead')
            }
          }
        }

        // Fall death
        if (player.y > CANVAS_H + 50) {
          stateRef.current = 'dead'
          setGameState('dead')
        }

        // Keep player from going left past camera
        if (player.x < cameraRef.current) {
          player.x = cameraRef.current
        }

        // Camera follows player
        const targetCam = player.x - 200
        cameraRef.current += (targetCam - cameraRef.current) * 0.08
        if (cameraRef.current < 0) cameraRef.current = 0

        // Auto-scroll camera minimum
        cameraRef.current = Math.max(cameraRef.current, cameraRef.current + SCROLL_SPEED * 0.01)
      }

      // Draw
      const camX = cameraRef.current
      drawBackground(ctx, camX)

      level.platforms.forEach(p => drawPlatform(ctx, p, camX))
      level.coins.forEach(c => drawCoin(ctx, c, camX))
      level.enemies.forEach(e => drawEnemy(ctx, e, camX))
      drawPlayer(ctx, player, camX)

      // HUD
      if (state === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(10, 10, 200, 36)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1
        ctx.strokeRect(10, 10, 200, 36)

        ctx.font = '14px "Press Start 2P"'
        ctx.fillStyle = '#f1c40f'
        ctx.textAlign = 'left'
        ctx.fillText(`SCORE ${scoreRef.current}`, 20, 34)
      }

      if (state === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        ctx.font = '28px "Press Start 2P"'
        ctx.fillStyle = '#e74c3c'
        ctx.textAlign = 'center'
        ctx.fillText('SUPER MARIO', CANVAS_W / 2, CANVAS_H / 2 - 60)

        ctx.font = '18px "Press Start 2P"'
        ctx.fillStyle = '#f1c40f'
        ctx.fillText('RUN', CANVAS_W / 2, CANVAS_H / 2 - 25)

        ctx.font = '10px "Press Start 2P"'
        ctx.fillStyle = '#fff'
        ctx.fillText('ARROW KEYS / WASD TO MOVE', CANVAS_W / 2, CANVAS_H / 2 + 20)
        ctx.fillText('SPACE / UP TO JUMP', CANVAS_W / 2, CANVAS_H / 2 + 40)

        ctx.font = '10px "Press Start 2P"'
        ctx.fillStyle = '#a29bfe'
        ctx.fillText('PRESS ANY KEY TO START', CANVAS_W / 2, CANVAS_H / 2 + 75)
      }

      if (state === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
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
        ctx.fillText('PRESS ANY KEY TO RETRY', CANVAS_W / 2, CANVAS_H / 2 + 70)
      }

      frameRef.current = requestAnimationFrame(gameLoop)
    }

    frameRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [drawBackground, drawCoin, drawEnemy, drawPlatform, drawPlayer, highScore, onScoreUpdate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
      if (e.code === 'Escape') {
        onBack()
        return
      }
      keysRef.current.add(e.code)

      if (stateRef.current === 'idle') {
        stateRef.current = 'playing'
        setGameState('playing')
      } else if (stateRef.current === 'dead') {
        resetGame()
        stateRef.current = 'playing'
        setGameState('playing')
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onBack, resetGame])

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
    boxShadow: '0 0 40px rgba(231, 76, 60, 0.3)',
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
        onClick={() => {
          if (stateRef.current === 'idle') {
            stateRef.current = 'playing'
            setGameState('playing')
          } else if (stateRef.current === 'dead') {
            resetGame()
            stateRef.current = 'playing'
            setGameState('playing')
          }
        }}
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
