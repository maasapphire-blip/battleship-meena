# Battleship

Browser Battleship — you vs. an AI. React 19 + TypeScript + Vite; deployed as a static nginx
container on Google Cloud Run.

**Play:** not deployed yet — see [progress.md](progress.md) for the current state and the local dev link.

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
