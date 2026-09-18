# Progress

True state of the project after each run. Updated at the end of every Devin run.
Legend: `[x]` done and verified · `[~]` partially done · `[ ]` not started

**Last updated:** 2026-09-18 (run 5)
**Public play link (GitHub Pages):** https://maasapphire-blip.github.io/battleship-meena/ — **live** (verified 2026-09-16 after PR #1 merged; Pages source set to "GitHub Actions" in repo settings). Redeploys on every push to `main` via `.github/workflows/pages.yml`. **Cloud Run (production):** GCP project `project-c9d27649-7397-4366-8f0`, region `us-central1`, service `battleship`. WIF + Artifact Registry set up 2026-09-18 (run 5); `.github/workflows/deploy.yml` deploys on every push to `main`. **First deploy runs when the run-5 PR is merged — URL to be recorded here once it has succeeded.**

## Milestone status

| # | Milestone | Status | Notes |
|---|-----------|--------|-------|
| M0 | Scaffold: Vite + React + TS, Vitest/RTL, oxlint, Dockerfile + nginx, GitHub Actions CI | [x] | `npm run lint / typecheck / test / build` all pass locally. CI has not run yet (first push happens with this run). |
| M1 | Core game logic: types, ship geometry, board placement/firing, tests | [x] | 15 unit tests in `src/game/board.test.ts`. |
| M2 | Reducer + seeded RNG + Easy AI + full simulated games | [x] | 16 reducer tests incl. 100 simulated games; 6 RNG/AI tests. |
| M3 | Boards + ship sprites (SVG vessels over the grid) | [x] | `Board`, `ShipSprite`, `FleetTracker` components. Own ships show flames on hit, charred when sunk; enemy ships revealed only when sunk. |
| M4 | Playable loop: click-to-fire, AI reply with delay, status bar, game-over scoreboard | [x] | AI replies after 650 ms. Mobile (coarse pointer) uses tap-to-aim then FIRE. Every player hit names the enemy ship and its damage ("You hit the enemy Cruiser at C4! (1 of 3)"), the hit cell gets a ship-coloured mark, and the enemy fleet tracker shows `hit 1/3` (bug M3, run 4). |
| M5 | Manual placement: hover ghost (green/red), click to place, rotate (button / `R`), randomize, clear, pick up placed ship | [x] | Basic version done. No drag-and-drop, no keyboard-only placement yet. |
| M6 | Game over screen with stats + persistence (win/loss record, settings in localStorage) | [~] | Scoreboard pop-up (shots/accuracy/ships sunk/ships lost, View boards, Play again) opens at game over (bug M2, run 4); "View boards" closes it to a compact result bar with a "Scoreboard" button to reopen. Enemy fleet fully revealed behind/after it with surviving ships in red (bug M1, run 3). **No localStorage persistence yet.** |
| M7 | Animations (shot pop, miss ripple, hit flash, flame flicker, result slide-in, surviving-ship reveal) + reduced-motion | [~] | Basic CSS keyframes done and `prefers-reduced-motion` respected. Placement snap animation not done. |
| M8 | Haptics + settings panel (haptics toggle, tap-to-aim toggle) | [ ] | Not started. |
| M9 | Normal (hunt & target + parity) and Hard (probability density) AI | [x] | `ai/normal.ts`, `ai/hard.ts`, shared `ai/target.ts`; 19 tests in `strategies.test.ts` incl. 300 simulated games and the Hard < Normal < Easy ordering. Local 300-game sim: Easy ≈ 96, Normal ≈ 52, Hard ≈ 45 shots on average (sanity check only, not a tuning target). |
| M10 | Polish + accessibility pass (keyboard nav on grid, screen reader announcements, colour contrast) | [~] | Cells are buttons with aria-labels, status is `aria-live`. No arrow-key navigation yet. |
| M11 | Cloud Run deployment (Artifact Registry, Workload Identity Federation, GitHub Actions deploy) | [~] | GCP one-time setup done (APIs, `devin-deployer` SA, AR repo `battleship`, WIF pool/provider locked to this repo); `deploy.yml` carries the project/region/provider/SA as plain env values (org policy forbids SA keys). Docker image builds locally. **Not yet deployed — first run happens on merge of the run-5 PR; verify and record the `*.run.app` URL.** GitHub Pages link stays as a mirror. |

## Verification (run 5)

```
docker build .        -> pass (nginx image serves index.html on :8080 locally)
npm run lint/typecheck/test/build -> unchanged from run 4 (no app code changed)
Cloud Run deploy      -> pending: runs in GitHub Actions on merge to main
```

## Verification (run 4)

```
npm run lint       -> pass (oxlint, 3 pre-existing warnings, 0 errors)
npm run typecheck  -> pass (tsc -b)
npm test           -> 58 tests pass (5 files) — game-over test now asserts the scoreboard dialog, View boards, reopen; new test asserts ship name + "1 of N" on first hit
npm run build      -> pass
Browser check      -> full game to Defeat on localhost: first hit showed "You hit the enemy Carrier at A9! (1 of 5)" + tracker "hit 1/5"; scoreboard pop-up with 4 stats; View boards revealed 2 surviving ships; Scoreboard reopened it
```

## Verification (run 3)

```
npm run lint       -> pass (oxlint, 3 pre-existing warnings, 0 errors)
npm run typecheck  -> pass (tsc -b)
npm test           -> 57 tests pass (5 files) — new: App plays to game over and asserts all 5 enemy ships are rendered
npm run build      -> pass
Browser check      -> full game to Defeat on localhost: result card above boards, 2 surviving enemy ships revealed in red
```

## Verification (run 2)

```
npm run lint       -> pass (oxlint, 3 pre-existing warnings, 0 errors)
npm run typecheck  -> pass (tsc -b)
npm test           -> 56 tests pass (5 files)
npm run build      -> pass (dist/ ~242 kB JS, 6.9 kB CSS); also with BASE_PATH=/battleship-meena/
```

## Verification (run 1)

```
npm run lint       -> pass (oxlint, 0 warnings)
npm run typecheck  -> pass (tsc -b)
npm test           -> 37 tests pass (4 files)
npm run build      -> pass (dist/ ~238 kB JS, 6.7 kB CSS)
```

Manual check in Chrome (desktop, 1024x768): placement with ghost preview, rotate via `R`, randomize, start, 8 shots incl. one hit, AI replies landing on own ships with flame — all as expected.

Recorded play-test (testing agent, Chrome on Linux): full desktop game to Victory (54 shots), New game mid-battle, Play again, and 390x844 touch emulation (stacked boards, tap-to-aim then FIRE) all passed; no console errors. One cosmetic defect found and fixed (bugs.md D3: emoji icons → inline SVG). Not yet tested on a physical phone; Defeat overlay copy not exercised.

## How to play (current)

```
npm ci
npm run dev        # http://localhost:5173
```

## Known gaps / next run

1. M11 — confirm the first Cloud Run deploy succeeded, record the `*.run.app` URL here and in README; optionally trim the deployer SA's setup-only roles (architecture.md).
2. M8 — haptics helper + settings panel.
3. M6 — localStorage for difficulty + win/loss record.
4. M7/M10 — remaining animations (sunk reveal, placement snap), arrow-key grid navigation.
5. Playwright E2E suite (not started). Normal/Hard have unit + simulation coverage but have not been play-tested in the browser yet.

See `bugs.md` for defects.
