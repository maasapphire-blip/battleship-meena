# Progress

True state of the project after each run. Updated at the end of every Devin run.
Legend: `[x]` done and verified · `[~]` partially done · `[ ]` not started

**Last updated:** 2026-09-15 (run 1)
**Play link:** dev preview only (see "How to play" below). No Cloud Run deployment yet.

## Milestone status

| # | Milestone | Status | Notes |
|---|-----------|--------|-------|
| M0 | Scaffold: Vite + React + TS, Vitest/RTL, oxlint, Dockerfile + nginx, GitHub Actions CI | [x] | `npm run lint / typecheck / test / build` all pass locally. CI has not run yet (first push happens with this run). |
| M1 | Core game logic: types, ship geometry, board placement/firing, tests | [x] | 15 unit tests in `src/game/board.test.ts`. |
| M2 | Reducer + seeded RNG + Easy AI + full simulated games | [x] | 16 reducer tests incl. 100 simulated games; 6 RNG/AI tests. |
| M3 | Boards + ship sprites (SVG vessels over the grid) | [x] | `Board`, `ShipSprite`, `FleetTracker` components. Own ships show flames on hit, charred when sunk; enemy ships revealed only when sunk. |
| M4 | Playable loop: click-to-fire, AI reply with delay, status bar, game-over modal | [x] | AI replies after 650 ms. Mobile (coarse pointer) uses tap-to-aim then FIRE. |
| M5 | Manual placement: hover ghost (green/red), click to place, rotate (button / `R`), randomize, clear, pick up placed ship | [x] | Basic version done. No drag-and-drop, no keyboard-only placement yet. |
| M6 | Game over screen with stats + persistence (win/loss record, settings in localStorage) | [~] | Modal with shots/accuracy/ships lost and Play again done. **No localStorage persistence yet.** |
| M7 | Animations (shot pop, miss ripple, hit flash, flame flicker, overlay fade) + reduced-motion | [~] | Basic CSS keyframes done and `prefers-reduced-motion` respected. Sunk-ship reveal and placement snap animations not done. |
| M8 | Haptics + settings panel (haptics toggle, tap-to-aim toggle) | [ ] | Not started. |
| M9 | Normal (hunt & target + parity) and Hard (probability density) AI | [ ] | **Not started. Selecting Normal or Hard in the UI currently plays the Easy (random) AI.** |
| M10 | Polish + accessibility pass (keyboard nav on grid, screen reader announcements, colour contrast) | [~] | Cells are buttons with aria-labels, status is `aria-live`. No arrow-key navigation yet. |
| M11 | Cloud Run deployment (Artifact Registry, Workload Identity Federation, GitHub Actions deploy) | [~] | `Dockerfile`, `nginx.conf` and `.github/workflows/deploy.yml` written. **Not deployed — needs a GCP project + WIF setup (see architecture.md § Deployment).** |

## Verification (this run)

```
npm run lint       -> pass (oxlint, 0 warnings)
npm run typecheck  -> pass (tsc -b)
npm test           -> 37 tests pass (4 files)
npm run build      -> pass (dist/ ~238 kB JS, 6.7 kB CSS)
```

Manual check in Chrome (desktop, 1024x768): placement with ghost preview, rotate via `R`, randomize, start, 8 shots incl. one hit, AI replies landing on own ships with flame — all as expected. Mobile layout not yet checked in a real device/emulator.

## How to play (current)

```
npm ci
npm run dev        # http://localhost:5173
```

## Known gaps / next run

1. M9 — implement Normal and Hard AI (biggest functional gap; difficulty selector is misleading until then).
2. M6 — localStorage for difficulty + win/loss record.
3. M8 — haptics helper + settings panel.
4. M11 — create GCP project, Artifact Registry repo, WIF provider; set GitHub repo variables; first deploy.
5. Playwright E2E suite (not started).

See `bugs.md` for defects.
