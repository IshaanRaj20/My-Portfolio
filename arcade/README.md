# 🕹️ Arcade Zone

A full-stack React game arcade featuring classic retro games rendered with HTML5 Canvas.

## Games

- **Flappy Bird** — Tap/click to fly through pipes. Test your timing and reflexes!
- **Super Mario Run** — Side-scrolling platformer with enemies, coins, and platforms.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express 5 (score tracking API)
- **Rendering**: HTML5 Canvas (no external game libraries)
- **Styling**: CSS custom properties, dark gaming theme

## Getting Started

```bash
npm install
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API (port 3001).

### Controls

**Flappy Bird**
- `Space` / `Click` — Flap
- `Escape` — Back to hub

**Super Mario Run**
- `Arrow Keys` / `WASD` — Move
- `Space` / `Up` — Jump
- `Escape` — Back to hub

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/games` | List available games |
| GET | `/api/scores?game=` | Get leaderboard |
| POST | `/api/scores` | Submit a score |

## Building for Production

```bash
npm run build
npm run preview
```
