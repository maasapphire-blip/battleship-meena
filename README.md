# Battleship

Browser Battleship — you vs. an AI (Easy / Normal / Hard). React 19 + TypeScript + Vite; static
bundle, packaged as an nginx container for Google Cloud Run.

**Play:** https://maasapphire-blip.github.io/battleship-meena/ (GitHub Pages, published from `main`).
Cloud Run deployment (project `project-c9d27649-7397-4366-8f0`, `us-central1`) runs from GitHub Actions on every push to `main` — see [progress.md](progress.md) for the current URL and state.

## For reviewers

- Start with [architecture.md](architecture.md), then `src/game/` (pure rules + AI, no React) and
  `src/App.tsx` + `src/components/` (UI).
- The AI only ever sees `EnemyView` (`unknown | miss | hit` grid + sunk list) — `src/game/ai/common.ts`.
  Difficulty = which strategy is selected: `easy.ts`, `normal.ts`, `hard.ts`.
- `npm test` runs 56 unit/component tests including hundreds of simulated full games.

## Docs

- [progress.md](progress.md) — true state of every milestone, updated after each run
- [architecture.md](architecture.md) — code layout, game model, AI boundary, UI approach, deployment
- [bugs.md](bugs.md) — bugs found by Devin / by Meena
- [docs/plan.md](docs/plan.md) — original project plan

## Develop

```bash
nvm use 20            # or any Node >= 20
npm ci
npm run dev           # http://localhost:5173
npm run lint          # oxlint
npm run typecheck     # tsc -b
npm test              # vitest
npm run build         # dist/
```

## Docker (same image Cloud Run runs)

```bash
docker build -t battleship .
docker run --rm -p 8080:8080 battleship   # http://localhost:8080
```
