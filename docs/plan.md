# Battleship — Project Plan

## 1. Goal & Scope
A browser-based Battleship game (mobile-first, also desktop) where a human plays against a computer opponent.
- Classic rules: 10x10 grid, fleet of 5 ships (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2), alternating shots, first to sink the whole enemy fleet wins.
- v1: single player vs AI with three difficulty levels (Easy / Normal / Hard). Later: two-player hot-seat, online multiplayer.
- Non-functional: polished animations, haptic feedback on mobile, accessible, works offline (PWA optional).

## 2. Tech Stack
| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| State | `useReducer` + Context (pure reducer in `src/game/`) |
| Styling | CSS Modules + CSS variables (or Tailwind) |
| Animation | Framer Motion (component transitions) + CSS keyframes (cell effects) |
| Haptics | `navigator.vibrate` behind a `haptics.ts` interface (swap to Capacitor Haptics for native builds) |
| Unit/logic tests | Vitest |
| Component tests | React Testing Library + `@testing-library/user-event` |
| E2E | Playwright (desktop + mobile viewport projects) |
| Lint/format | ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier |
| CI/CD | GitHub Actions: lint → typecheck → unit → build → e2e → Docker build → Cloud Run deploy |
| Hosting | Google Cloud Run (static build served by nginx in a Docker container; see §8) |

## 3. Architecture

```
src/
  game/                 # pure TS, zero React imports, 100% unit-tested
    types.ts            # Coord, Orientation, Ship, Cell, Board, GameState, Action
    constants.ts        # BOARD_SIZE=10, FLEET
    board.ts            # createBoard, canPlace, placeShip, removeShip, fire
    ships.ts            # shipCells, isSunk, allSunk
    ai/                 # Ai interface, easy.ts / normal.ts / hard.ts strategies, probabilityMap.ts, rng.ts
    reducer.ts          # gameReducer(state, action): GameState
    selectors.ts        # remainingShips, shotsFired, accuracy, isCellDisabled
  services/
    haptics.ts          # tap/miss/hit/sunk/win/lose; feature-detect + user toggle
    storage.ts          # settings + stats in localStorage
  hooks/
    useGame.ts          # wraps reducer, schedules AI turn, triggers haptics/sfx
    useReducedMotion.ts
  components/
    App.tsx             # phase router: placing | playing | over
    StatusBar.tsx
    Grid.tsx / Cell.tsx # presentational, receives cells + preview + handlers
    ShipLayer.tsx       # absolutely-positioned overlay drawing ships across cells
    ShipSprite.tsx      # SVG vessel (hull/bridge/turrets) for a given length; hits, sunk, ghost variants
    MiniShip.tsx        # small silhouette for ShipDock / fleet trackers
    ShipDock.tsx        # fleet list, current ship, sunk status
    Controls.tsx        # rotate / randomize / clear / start / settings
    GameOverModal.tsx
    SettingsPanel.tsx   # haptics on/off, sound, reduced motion, difficulty
  styles/
```

### Game state
```ts
type Phase = 'placing' | 'playing' | 'over';
interface GameState {
  phase: Phase;
  player: Board; enemy: Board;
  placing: { shipIndex: number; orientation: Orientation };
  turn: 'player' | 'ai';
  lastEvent?: { by: 'player'|'ai'; coord: Coord; result: 'miss'|'hit'|'sunk'; shipName?: string };
  winner?: 'player' | 'ai';
  difficulty: 'easy' | 'normal' | 'hard';
  aiMemory: AiMemory;          // strategy-specific (see §4)
  rngSeed: number;             // deterministic for tests
}
type Action =
  | { type: 'PLACE_SHIP'; at: Coord } | { type: 'ROTATE' } | { type: 'RANDOMIZE' } | { type: 'CLEAR' }
  | { type: 'START' } | { type: 'FIRE'; at: Coord } | { type: 'AI_FIRE' } | { type: 'RESET' };
```
Rules live entirely in the reducer; components never compute game rules. The AI turn is scheduled by `useGame` (600ms delay) so it can be animated and tested independently.

## 4. Game Logic & AI Difficulty

All of this lives in `src/game/` as pure functions (no React, no DOM) and is driven by a seeded RNG so every behaviour is reproducible in tests.

### 4.1 Rules engine
- **Board**: 10x10, coords `{x: 0-9, y: 0-9}` (displayed as A–J / 1–10). Cell state: `water | miss | hit`; ship occupancy is stored on the ship, not the cell.
- **Fleet**: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. Ships are straight lines, horizontal or vertical.
- **Placement validity** (`canPlace`): fully in bounds; no overlap with another ship. Adjacent (touching) ships are allowed by default; `rules.noTouching` flag reserved for a future variant.
- **Firing** (`fire(board, coord)`): returns `miss | hit | sunk | invalid` (invalid = already fired, ignored by reducer). A hit marks the ship segment; when all segments are hit the ship is `sunk` and the result carries the ship name.
- **Turns**: player fires → AI fires → … (one shot per turn, classic rules; `rules.salvo` reserved for future). Turn never changes on an invalid shot.
- **Win**: after any shot, if all opposing ships are sunk → `phase = 'over'`, `winner` set. Player and AI are checked symmetrically.
- **Reducer guarantees** (tested): every action is a no-op outside its legal phase; state is immutable (new objects returned); `RESET` yields a fresh game with a new seed; `RANDOMIZE` always produces a valid fleet.

### 4.2 AI architecture
Difficulty is defined purely by **what the AI is allowed to know and how it reasons** — there is no measurement, calibration, telemetry or adaptive behaviour. The player just picks Easy / Normal / Hard.

```ts
// The ONLY input any AI receives. Ship positions are not reachable by construction.
interface EnemyView {
  cells: ('unknown' | 'miss' | 'hit')[][];     // 10x10
  sunk: { name: ShipName; length: number }[];  // ships the AI has already sunk
  remaining: { name: ShipName; length: number }[];
}
interface Ai<M> {
  placeFleet(rng: Rng): Ship[];
  chooseShot(view: EnemyView, memory: M, rng: Rng): { coord: Coord; memory: M };
  onResult(result: ShotResult, coord: Coord, memory: M): M;   // update memory after the reducer resolves the shot
}
const AIS: Record<Difficulty, Ai<unknown>> = { easy: easyAi, normal: normalAi, hard: hardAi };
```
- `state.difficulty` is chosen on the start screen/settings, persisted in localStorage, and fixed for the duration of a game.
- The reducer builds `EnemyView` from the player's board on each `AI_FIRE` and calls `AIS[state.difficulty]`.
- `AiMemory` is whatever a strategy chooses to remember between turns; reset on `RESET`.
- Shared helpers in `game/ai/common.ts`: `untriedCells(view)`, `neighbors(coord)`, `parityCells(view)`, `legalPlacements(view, length)`, `pick(rng, list)`, `argmaxRandomTie(map, rng)`.
- Each level is a strict superset of the one below in reasoning power.

### 4.3 Easy — random shooter (`game/ai/easy.ts`, ~10 lines)
- **Placement**: uniform random valid positions.
- **Shooting**: uniformly random untried cell. No memory; a hit does not influence the next shot.
```ts
chooseShot(view, _, rng) => ({ coord: pick(rng, untriedCells(view)), memory: null })
```

### 4.4 Normal — hunt & target with parity (`game/ai/normal.ts`, ~80 lines)
- **Placement**: uniform random valid positions.
- **Hunt mode** (no open hits): fire only at untried cells on a checkerboard parity `(x + y) % 2 === 0`. Every ship is ≥ 2 long so each must cover one such cell; this halves the search space.
- **Target mode**: after a hit, queue its 4 untried neighbours. Once two open hits are in line, drop off-axis candidates and only extend along that axis in both directions until a miss or the board edge closes each end.
- **On sunk**: remove that ship's cells from `openHits`. If hits remain (adjacent ships), rebuild the queue from their neighbours; otherwise return to hunting.
```ts
type Memory = { openHits: Coord[]; queue: Coord[] };
chooseShot(view, mem, rng) {
  if (mem.queue.length) return { coord: mem.queue[0], memory: { ...mem, queue: mem.queue.slice(1) } };
  return { coord: pick(rng, parityCells(view)), memory: mem };
}
onResult(result, coord, mem) {
  if (result === 'miss') return mem;
  const openHits = [...mem.openHits, coord];
  if (result === 'sunk') {
    const left = openHits.filter(h => !sunkShipCells.includes(h));
    return { openHits: left, queue: left.flatMap(neighbors).filter(untried) };
  }
  const queue = axisKnown(openHits) ? endpointsAlongAxis(openHits).filter(untried)
                                    : neighbors(coord).filter(untried);
  return { openHits, queue };
}
```

### 4.5 Hard — probability density (`game/ai/hard.ts`, ~120 lines)
- **Placement**: random, but rejects layouts where ships touch, and avoids putting every ship on the same parity so a naive checkerboard sweep is less effective.
- **Shooting**: each turn, for every *remaining* ship, enumerate all legal placements consistent with the view (in bounds, covering no `miss` and no cell of a sunk ship). For each untried cell, count how many placements cover it → heat map. If open hits exist, only placements covering at least one open hit count, weighted `k^hitsCovered` (k ≈ 10) so placements explaining more hits dominate. Fire at the hottest cell; ties broken by RNG.
- This subsumes hunt/target automatically (cells adjacent to a hit dominate the map) and correctly handles cases Normal gets wrong: adjacent ships, L-shaped hit clusters, and a "line" of hits that is actually two ships.
- Cost: ≤ 5 ships × ≤ 200 placements × ≤ 5 cells ≈ 5k operations per shot — negligible.
```ts
chooseShot(view, mem, rng) {
  const map = zeros(10, 10);
  for (const ship of view.remaining)
    for (const p of legalPlacements(view, ship.length)) {
      const covered = p.cells.filter(c => view.cells[c.y][c.x] === 'hit').length;
      if (mem.openHits.length && covered === 0) continue;
      for (const c of p.cells) if (view.cells[c.y][c.x] === 'unknown') map[c.y][c.x] += 10 ** covered;
    }
  return { coord: argmaxRandomTie(map, rng), memory: mem };
}
onResult(result, coord, mem) { /* track openHits exactly as Normal does; no queue needed */ }
```

### 4.6 Keeping the levels honest
- **Type-level**: `chooseShot` only receives `EnemyView`, so hidden ship data is unreachable by any level.
- **Behavioural unit tests on hand-built boards**: Easy ignores hits; Normal fires adjacent after a hit and extends along the axis after two aligned hits; Hard picks the centre of a 3-cell gap when only the Cruiser remains, and prefers cells explaining two hits over one.
- **Ordering test**: on a fixed seed set, Hard sinks a fleet in fewer shots than Normal, which needs fewer than Easy. This is a correctness check that each level does what it claims — not a tuning loop.
- AI "think" delay is UI-only (~600ms); all logic is synchronous and deterministic given the seed.

## 5. UI / UX Plan

### Design decision: ships are drawn as vessels, not coloured squares
Approved via the mockup (`battleship-mockup/index.html`). Rules:
- Each ship is an SVG vessel (`ShipSprite`) that spans its cells, rendered in a `ShipLayer` overlay positioned absolutely over the CSS grid (`left = label + gap + x*step`, `top = step + y*step`; vertical ships rotate 90° about the top-left corner and translate by one cell).
- Cells underneath a ship stay plain water; all ship-related state is shown **on the ship**:
  - Own ship, undamaged: grey hull, light deck details.
  - Own ship, hit segment: charred hole + animated flame on that segment.
  - Sunk (either side): whole hull turns charred/dark; flames remain.
- Enemy board: hits on unsunk ships are red ✕ cells (ship identity unknown); when a ship is sunk, the red cells are replaced by the revealed charred vessel.
- Placement ghost: the current ship's sprite tinted green (valid) or red (invalid) follows the pointer/tap.
- Fleet trackers use `MiniShip` silhouettes; sunk ones are charred + labelled "sunk", placed ones get a ✓.
- Misses on both boards are a small white dot with a ripple animation.
- Sprite sizing must follow the CSS `--cell` variable so mobile (30px) and desktop (32px) stay aligned; `ShipLayer` recomputes positions on resize.

### Layout
- Header: title + StatusBar (narrates: "Place your Carrier (5)", "Your turn", "Hit! You sunk the Cruiser", "You win!").
- Two 10x10 grids with A–J / 1–10 labels: yours (ships visible) and enemy (hidden). Side by side ≥ 768px, stacked on mobile with enemy grid on top.
- ShipDock + Controls below/aside.

### Phase 1 — Placement
- ShipDock highlights current ship (mini silhouette). Tap a cell to place; the ship sprite ghost shows validity (green/red).
- Rotate via button or `R`; Randomize, Clear, Start Battle (enabled when all 5 placed).
- Mobile: tap-to-select cell + confirm, or drag ship; no hover-only features.

### Phase 2 — Battle
- Enemy grid clickable; fired cells disabled. Option "tap to aim, tap again to fire" for mobile.
- Cell states: water, miss, hit (enemy board only), aim. Ship states live on sprites: intact, hit-segment, sunk, ghost-ok, ghost-bad.
- After player's shot, input locks while AI fires (~600ms), result animates on player grid.
- Enemy fleet tracker shows sunk ships.

### Phase 3 — Game Over
- Overlay with result, shots/accuracy, enemy board revealed, Play Again. Stats saved to localStorage.

### Animations (≤ 400ms each; honour `prefers-reduced-motion`)
- Placement: ghost sprite snaps into place (scale 1.05→1); invalid placement shakes the ghost.
- Shot: shell scale-in on cell → miss ripple / hit: red ✕ flash (enemy) or flame ignites on the ship segment (own) / sunk: ship reveal flips in, hull darkens, brief smoke puff.
- Flames flicker continuously (CSS keyframes, paused under reduced-motion).
- Board dim while AI "thinks"; game-over overlay fade, ship reveal stagger, confetti on win.

### Haptics (`services/haptics.ts`)
| Event | Pattern (ms) |
|---|---|
| tap/place/rotate | 10 |
| miss | 20 |
| hit | 40 |
| sunk | [40, 60, 40] |
| win | [60, 40, 60, 40, 120] |
| lose | 200 |
Feature-detected; user toggle in Settings; iOS Safari silently no-ops (Capacitor plugin later if a native build is needed).

### Accessibility
- Cells are `<button>`s with `aria-label` ("B7, miss"), arrow-key navigation, live region for StatusBar, 32px+ touch targets, colour + icon (not colour alone) for hit/miss.

## 6. Milestones

| # | Milestone | Deliverables | Done when |
|---|---|---|---|
| 0 | Scaffold | Vite React-TS, ESLint/Prettier, Vitest, RTL, Playwright, CI workflow, folder structure | `npm run lint/typecheck/test/build` green in CI |
| 1 | Core logic | `types`, `board.ts`, `ships.ts` + tests | placeShip/fire fully tested incl. edge cases |
| 2 | Reducer + AI v1 | `reducer.ts`, `ai.ts` (random placement, random shots), seeded RNG, win detection + tests | Full simulated game runs to completion in a test |
| 3 | Static UI + ship sprites | `Grid`, `Cell`, `ShipSprite`, `ShipLayer`, `MiniShip`, `StatusBar`, `ShipDock`, `App` phase router, base styles | Both boards render from state with vessels aligned to cells on desktop + mobile; sunk/hit/ghost variants visible in Storybook-style demo page |
| 4 | Battle loop | Click/tap to fire, `useGame` schedules AI turn, disabled cells, status narration | Playable end-to-end with random placement |
| 5 | Placement UI | Ghost sprite preview, rotate, randomize, clear, pick-up placed ship, start; mobile tap flow | Manual placement works on desktop + mobile |
| 6 | Game over + persistence | `GameOverModal`, stats, Play Again, `storage.ts` | Replay resets cleanly; stats persist |
| 7 | Animations | Framer Motion + keyframes for all events, reduced-motion support | All events animated; reduced-motion verified |
| 8 | Haptics + settings | `haptics.ts`, `SettingsPanel`, toggles | Vibration on Android Chrome; no errors elsewhere |
| 9 | AI levels | `Ai` interface + `EnemyView`, Easy/Normal/Hard strategies, difficulty setting (start screen + settings, persisted) | Behavioural tests per level pass; ordering test Hard < Normal < Easy passes on fixed seeds |
| 10 | Polish | A11y audit, PWA manifest, Lighthouse ≥ 90 | Scores met on staging |
| 11 | Deployment to Cloud Run | Dockerfile (nginx), `cloudbuild`/GitHub Actions deploy, staging + prod services, custom domain | Public HTTPS URL live; PR previews auto-deployed |

Suggested order of effort: 0–2 first (pure logic, fast feedback), then 3–6 for a playable game, then 7–10. Set up milestone 11's staging deploy early (right after milestone 4) so every PR is playable on a real phone.

## 7. Testing Methodology

### Pyramid
- ~70% unit (game logic, reducer, AI, haptics/storage services)
- ~20% component (RTL)
- ~10% E2E (Playwright)

### Unit tests (Vitest) — `src/game/**/*.test.ts`
- `board.ts`: placement in bounds, out of bounds, overlap, both orientations; fire → miss/hit/sunk/already-fired; immutability (no mutation of input).
- `ships.ts`: isSunk, allSunk.
- `ai/*`: every level's placement yields a valid fleet (property test: 1000 seeds; Hard's has no touching ships); no level fires the same cell twice; `EnemyView` type prevents reading hidden data; behavioural tests from §4.6 (Easy ignores hits, Normal neighbour/axis targeting, Hard heat-map choices); ordering test Hard < Normal < Easy shots on a fixed seed set; all deterministic given a seed.
- `reducer.ts`: every action from every phase (illegal actions are no-ops); turn alternation; win detection for both sides; RESET returns to initial state.
- Simulation: play 500 full AI-vs-AI games per level with seeded RNG; assert every game terminates with a winner and no illegal shots (a correctness check, not tuning).
- `haptics.ts`: calls `navigator.vibrate` with expected patterns; no-op when unsupported or disabled.
- `storage.ts`: round-trips settings/stats; tolerates corrupt JSON.
- Coverage target: ≥ 95% for `src/game`, ≥ 80% overall (enforced in CI).

### Component tests (RTL)
- `Grid`/`Cell`: renders 100 cells, correct aria-labels/classes per state, click handler called with coord, disabled after fired.
- `ShipSprite`: correct number of segments, flame on hit indices, sunk class, ghost variants; snapshot per length/orientation.
- `ShipLayer`: computes correct `left/top/width/transform` for horizontal and vertical ships at both cell sizes; enemy board renders only sunk ships.
- `ShipDock`: highlights current ship, shows sunk state.
- `StatusBar`: live region text updates per `lastEvent`.
- `App` integration: placement → start → fire → AI responds (fake timers) → game over modal → play again.
- Animations mocked (`framer-motion` reduced motion / `vi.mock`) so tests are deterministic.

### E2E (Playwright)
- Projects: Desktop Chrome, Mobile Chrome (Pixel 7), Mobile Safari (iPhone 14).
- Flows: place fleet manually; randomize + start; fire until win (seed injected via `?seed=` query param for determinism); reduced-motion mode; settings persistence across reload.
- Visual regression: screenshot snapshots of each phase per viewport — especially ship/grid alignment, hit flames and sunk reveal (animations frozen via reduced-motion).
- Haptics: stub `navigator.vibrate` via `page.addInitScript` and assert call patterns.
- Accessibility: `@axe-core/playwright` on each phase, zero serious violations.

### Manual / device testing
- Real Android device for vibration and touch-target feel; iOS device to confirm graceful no-op.
- Checklist per release: orientation change, slow 3G, offline (if PWA), screen reader pass (TalkBack/VoiceOver).

### CI gates (GitHub Actions, on every PR)
1. `npm run lint` + `npm run typecheck`
2. `npm run test -- --coverage` (thresholds enforced)
3. `npm run build`
4. `npx playwright test` (Chromium + mobile projects; artifacts on failure)
5. Lighthouse CI on preview deploy (perf/a11y ≥ 90) — non-blocking warning

### Definition of Done (per milestone)
- Tests written alongside code and passing; coverage not decreased.
- Lint/typecheck clean; no `any`.
- Works on desktop + mobile viewport; keyboard accessible.
- PR reviewed and merged; CI green.

## 8. Deployment — Google Cloud Run

The app is a static SPA, so the container just serves `dist/` with nginx.

### Artifacts (added in milestone 0/11)
```
Dockerfile
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package*.json ./ && RUN npm ci
  COPY . . && RUN npm run build
  FROM nginx:1.27-alpine
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  COPY --from=build /app/dist /usr/share/nginx/html
  # Cloud Run injects $PORT (default 8080); nginx.conf listens on 8080
nginx.conf   # listen 8080; gzip on; try_files $uri /index.html (SPA fallback); cache-control for hashed assets
.dockerignore
```

### GCP setup (once)
1. Create project, enable APIs: Cloud Run, Artifact Registry, Cloud Build (or use GH Actions runner), IAM.
2. `gcloud artifacts repositories create battleship --repository-format=docker --location=<region>`.
3. Service account `github-deployer` with roles: `run.admin`, `artifactregistry.writer`, `iam.serviceAccountUser`.
4. Configure **Workload Identity Federation** for GitHub Actions (no long-lived JSON keys).
5. Two Cloud Run services: `battleship-staging`, `battleship-prod` (`--allow-unauthenticated`, min instances 0, max 3, 256Mi, concurrency 80).

### CD pipeline (GitHub Actions `deploy.yml`)
- On PR: build image tagged with the commit SHA → deploy to `battleship-staging` as a **tagged, no-traffic revision** (`--tag pr-123 --no-traffic`) → comment the preview URL (`https://pr-123---battleship-staging-xxxx.a.run.app`) on the PR. Playwright mobile E2E runs against that URL.
- On merge to `main`: deploy to staging with 100% traffic; run smoke E2E; then deploy to `battleship-prod` with `--no-traffic` and shift traffic gradually (`gcloud run services update-traffic --to-revisions LATEST=10`, then 100) — one-command rollback via `update-traffic --to-revisions <previous>=100`.
- Tags/releases: `v*` tags also publish a GitHub release with changelog.

### Ops
- Custom domain via Cloud Run domain mapping or a Global HTTPS Load Balancer (needed later for Cloud CDN / Cloud Armor).
- Monitoring: Cloud Run request latency/5xx dashboards + uptime check; budget alert on the project.
- Cost: static content on a min-instances-0 service is effectively free-tier for hobby traffic.
- Future backend (online multiplayer): add a second Cloud Run service (Node/WebSocket) behind the same LB; frontend stays static.

## 9. Risks & Mitigations
- iOS has no `navigator.vibrate` → interface abstraction, Capacitor later.
- Animation timing vs game state races → AI turn scheduled by reducer/hook, not by animation callbacks; tests use fake timers.
- Random AI untestable → seeded RNG passed through state.
- Mis-taps on small screens → aim-then-fire option, ≥ 30px cells.
- Ship sprites drifting out of alignment with grid cells (font/zoom/resize) → positions derived from one `--cell` variable, `ResizeObserver` re-layout, visual regression tests at both viewports.
- Cloud Run cold starts → static nginx image starts in <1s; set `min-instances=1` on prod if it ever matters.

## 10. Future Ideas
Hot-seat 2P, online multiplayer (WebSocket server), salvo mode, custom fleets, sound effects, leaderboards, PWA install, native wrapper (Capacitor).
