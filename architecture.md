# Architecture

Browser Battleship, human vs. AI. React 19 + TypeScript + Vite, no backend. The
production build is a static bundle served by nginx in a container on Google Cloud Run.

```
┌──────────────────────────── browser ────────────────────────────┐
│  App.tsx  ── useReducer(gameReducer) ──►  GameState              │
│    │                                        │                    │
│    │ dispatch(Action)                       │ props (read-only)  │
│    ▼                                        ▼                    │
│  components/  Board · ShipSprite · FleetTracker · StatusBar      │
│                                                                  │
│  game/  (pure TS, no React/DOM)                                  │
│    types · ships · board · reducer                               │
│    ai/  rng · common (EnemyView, Ai<M>) · easy · [normal] · [hard]│
└──────────────────────────────────────────────────────────────────┘
```

## Source layout

```
src/
  main.tsx                 React root
  App.tsx                  phase switch (placing → playing → over), AI turn scheduling, status text
  index.css                design tokens, grid, ship sprite styles, animations, responsive rules
  components/
    Board.tsx              10x10 grid of <button role=gridcell>, ship overlay, ghost preview
    ShipSprite.tsx         SVG vessel silhouette (hull/deck/bridge/turrets, scorch + flame per hit)
    FleetTracker.tsx       fleet list with mini silhouettes; selectable in placement, sunk state in battle
    StatusBar.tsx          aria-live status message
  hooks/
    useMediaQuery.ts       (pointer: coarse) detection for tap-to-aim on touch devices
  game/
    types.ts               BOARD_SIZE, Coord, ShipSpec, FLEET, Ship, Board, ShotResult, Difficulty
    ships.ts               shipCells, segmentAt, isSunk, allSunk, makeShip
    board.ts               createBoard, canPlace, placeShip, removeShip, fire, shotsFired, hitsOn
    reducer.ts             GameState, Action, createGame, gameReducer
    ai/
      rng.ts               tiny seeded PRNG (mulberry32-style), pure: nextFloat(rng) -> [value, rng']
      common.ts            EnemyView, Ai<M> interface, viewOf(board), randomFleet, helpers
      easy.ts              random shooter
      index.ts             AIS: Record<Difficulty, Ai>   (normal/hard currently alias easy — see progress.md)
  test/setup.ts            jest-dom matchers
```

## Game model

- `Board = { cells: CellState[][], ships: Ship[] }`, `CellState = 'water' | 'miss' | 'hit'`.
  Ship positions live only in `ships`; `cells` records shots. A cell is a ship cell iff some ship covers it.
- `Ship = ShipSpec & { origin, orientation: 'h' | 'v', hits: number[] }` where `hits` holds segment
  indices 0..length-1. `isSunk(ship) = hits.length === length`.
- Everything in `game/` is immutable: functions return new objects, never mutate inputs.
- `fire(board, coord)` returns `{ board, result }` where `result.kind ∈ miss | hit | sunk | invalid`.
  `invalid` (out of bounds or already fired) returns the same board reference.

### Reducer

`GameState`:

```ts
{
  phase: 'placing' | 'playing' | 'over'
  difficulty: 'easy' | 'normal' | 'hard'
  player: Board          // human's fleet; AI fires here
  enemy: Board           // AI's fleet; human fires here
  placing: { shipIndex, orientation }
  turn: 'player' | 'ai'
  lastEvent?: { by, coord, result }
  winner?: 'player' | 'ai'
  aiMemory: unknown      // strategy-owned, opaque to the reducer
  rng: Rng               // seeded, threaded through every random choice
}
```

Actions: `PLACE_SHIP, PICK_UP_SHIP, SELECT_SHIP, ROTATE, RANDOMIZE, CLEAR, SET_DIFFICULTY, START,
FIRE, AI_FIRE, RESET`. Invalid actions for the current phase/turn return the same state reference
(cheap no-op, easy to test with `toBe`). The reducer is deterministic given `(state, action)` because
all randomness comes from `state.rng`.

Turn flow: `FIRE` (player) → `turn = 'ai'` → `App` schedules `AI_FIRE` after 650 ms → `turn = 'player'`.
Win detection happens inside `FIRE`/`AI_FIRE` (`allSunk`).

### AI boundary

The AI never sees ship positions. It receives:

```ts
interface EnemyView {
  cells: ('unknown' | 'miss' | 'hit')[][]
  sunk: ShipSpec[]        // names + lengths of sunk ships
  remaining: ShipSpec[]
}
interface Ai<M> {
  initialMemory: M
  placeFleet(rng): [Ship[], Rng]
  chooseShot(view, memory, rng): [Coord, Rng]
  onResult(result, coord, view, memory): M
}
```

`viewOf(board)` builds the view; it is the only bridge from `Board` to the AI, so the type system
enforces the "no cheating" rule. Difficulty is purely which `Ai` implementation is selected — no
telemetry, no adaptive tuning.

- Easy (`ai/easy.ts`): uniform random untried cell, `memory = null`.
- Normal (`ai/normal.ts`): hunt on checkerboard parity `(x + y) % 2 === 0`; after a hit, fire at its
  untried neighbours; once two or more hits are aligned, only extend the run along that axis; on sunk,
  attribute the ship's cells to the aligned run and keep any leftover hits open (adjacent ships).
- Hard (`ai/hard.ts`): per remaining ship, enumerate every legal placement consistent with the view
  (no misses, no cells already attributed to a sunk ship), add its weight to each unknown cell it
  covers; while there are open hits only placements covering one count, weighted `2^hits`. Fires at the
  hottest cell, ties broken by the seeded RNG. Places its own fleet so no two ships touch.
- Shared `ai/target.ts`: `TargetMemory { openHits, sunkCells }`, `trackResult`, `targetCandidates`.

`strategies.test.ts` asserts each behaviour on hand-built boards, that no strategy ever repeats a cell
over hundreds of simulated games, and that over a fixed seed set Hard finishes in fewer shots than
Normal, which finishes in fewer than Easy (a correctness check, not tuning).

## UI

- The grid is a CSS Grid: column 1 / row 1 are labels, columns 2–11 / rows 2–11 are the 10x10 cells.
  Ships are absolutely placed **in the same grid** via `grid-column: start / span length` so they
  align to cells at any cell size; no pixel maths.
- `ShipSprite` draws in a horizontal coordinate space (100 units per cell) and applies
  `translate(100 0) rotate(90)` for vertical ships, so one path set serves both orientations.
- Own board: all ships visible, hit segments show scorch + animated flame, sunk ships are charred.
  Enemy board: unsunk hits are red ✕ cells; a sunk ship is revealed as a charred sprite.
- Placement ghost: hovering/focusing a cell renders the current ship at that origin, green if
  `canPlace`, red otherwise (clipped at the board edge).
- Touch devices (`pointer: coarse`): first tap aims (crosshair + FIRE button), second tap or FIRE fires.
- Responsive: `--cell` is `clamp(24px, (100vw - 64px)/11, 40px)`; boards go side-by-side ≥ 760 px and
  stack below. Buttons have a 44 px minimum height.
- Motion: CSS keyframes only; everything is disabled under `prefers-reduced-motion: reduce`.
- Accessibility: every cell is a `<button role="gridcell" aria-label="B7, miss">`; status is
  `role=status aria-live=polite`; the game-over result card is an inline `role=status` section above the boards (never an overlay, so the revealed enemy fleet stays visible).

## Testing

| Layer | Tool | Location | What |
|-------|------|----------|------|
| Unit | Vitest | `src/game/**/*.test.ts` | geometry, placement rules, firing, reducer transitions, RNG determinism, AI never repeats a cell, 100 simulated full games terminate |
| Component | Vitest + RTL + user-event | `src/*.test.tsx` | placement flow, ghost preview, pick-up, fire → AI reply with fake timers |
| E2E | Playwright | `e2e/` (planned) | full game on desktop + mobile viewport, reduced-motion |

CI (`.github/workflows/ci.yml`): `npm ci` → lint → typecheck → test (coverage) → build → `docker build`.

## Build & deployment

### GitHub Pages (public play link, interim)

`.github/workflows/pages.yml` (on push to `main`): `npm run build` with `BASE_PATH=/battleship-meena/`
(`vite.config.ts` reads `base` from `BASE_PATH`, default `/`) and publishes `dist/` with
`actions/deploy-pages`. Requires Pages source = "GitHub Actions" in the repo settings (the workflow
tries to enable it itself). Free, no auth, no server — the game is fully client-side.

### Cloud Run (production target)

- `Dockerfile`: multi-stage — `node:20-alpine` runs `npm ci && npm run build`; `nginx:1.27-alpine`
  serves `dist/` on port 8080 with `nginx.conf` (SPA fallback to `index.html`, immutable cache for
  `/assets/*`, `no-cache` for `index.html`, gzip).
- `.github/workflows/deploy.yml` (on push to `main`, or manual): authenticates to GCP via GitHub OIDC /
  Workload Identity Federation (no long-lived keys), builds and pushes
  `${REGION}-docker.pkg.dev/${PROJECT}/battleship/battleship:${sha}` to Artifact Registry, then
  `deploy-cloudrun` to service `battleship` (`--allow-unauthenticated --port 8080 --memory 256Mi
  --max-instances 3`). The job is skipped until the `GCP_PROJECT_ID` repository variable is set.

One-time GCP setup (not yet done):

```bash
PROJECT=<project-id> REGION=europe-west1 REPO=<github-owner>/battleship-meena
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
gcloud artifacts repositories create battleship --repository-format=docker --location=$REGION
gcloud iam service-accounts create battleship-deployer
for r in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:battleship-deployer@$PROJECT.iam.gserviceaccount.com" --role=$r
done
gcloud iam workload-identity-pools create github --location=global
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'"
gcloud iam service-accounts add-iam-policy-binding \
  battleship-deployer@$PROJECT.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT --format='value(projectNumber)')/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

Then in the GitHub repo: variables `GCP_PROJECT_ID`, `GCP_REGION`; secrets
`GCP_WORKLOAD_IDENTITY_PROVIDER` (full provider resource name) and `GCP_SERVICE_ACCOUNT`.

Rollback: `gcloud run services update-traffic battleship --to-revisions=<previous>=100`.

## Design decisions

- **Pure logic in `game/`** so rules and AI are unit-testable without a DOM and could be reused
  (e.g. for a future server-side multiplayer).
- **Threaded RNG instead of `Math.random`** for reproducible games in tests and debuggable AI.
- **Ships as SVG vessels** (user decision): more intuitive feedback than coloured squares; damage is
  drawn on the ship itself.
- **Difficulty = AI knowledge/reasoning, not measured tuning** (user decision): no shot-count
  targets, no player analytics.
- **Static nginx container on Cloud Run** (user decision): scales to zero, one image per commit,
  instant rollback via revisions.
