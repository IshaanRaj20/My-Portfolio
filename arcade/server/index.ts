import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface ScoreEntry {
  player: string
  game: string
  score: number
  timestamp: number
}

const scores: ScoreEntry[] = []

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.get('/api/games', (_req, res) => {
  res.json([
    {
      id: 'flappy-bird',
      title: 'Flappy Bird',
      description: 'Tap to fly through pipes!',
      difficulty: 'Medium',
    },
    {
      id: 'mario',
      title: 'Super Mario Run',
      description: 'Classic platformer adventure!',
      difficulty: 'Medium',
    },
  ])
})

app.get('/api/scores', (req, res) => {
  const game = req.query.game as string | undefined
  const filtered = game ? scores.filter(s => s.game === game) : scores
  const sorted = [...filtered].sort((a, b) => b.score - a.score).slice(0, 10)
  res.json(sorted)
})

app.post('/api/scores', (req, res) => {
  const { player, game, score } = req.body as { player?: string; game?: string; score?: number }
  if (!player || !game || typeof score !== 'number') {
    res.status(400).json({ error: 'Missing player, game, or score' })
    return
  }
  const entry: ScoreEntry = { player, game, score, timestamp: Date.now() }
  scores.push(entry)
  res.status(201).json(entry)
})

app.listen(PORT, () => {
  console.log(`Arcade Zone API running on http://localhost:${PORT}`)
})
