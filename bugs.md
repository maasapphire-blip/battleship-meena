# Bugs

Status: `open` · `fixed (<commit/PR>)` · `wontfix`

## Bugs found by Devin

| # | Found | Area | Description | Status |
|---|-------|------|-------------|--------|
| D1 | 2026-09-15 | AI | Difficulty selector offered Normal/Hard but both ran the Easy (random) AI (`AIS` registry pointed all three at `easyAi`). Fixed by implementing Normal (parity hunt & target) and Hard (probability density) in M9; `strategies.test.ts` asserts the registry and the Hard < Normal < Easy shot ordering. | fixed (PR #1, run 2) |
| D2 | 2026-09-15 | tests | `useMediaQuery` crashed under jsdom (`window.matchMedia is not a function`); guarded with a `typeof === 'function'` check. | fixed (run 1) |
| D3 | 2026-09-15 | UI | Emoji icons (⚓ 🎲 🔥 🏆 💥) rendered as empty boxes on systems without an emoji font (found during play-test on Linux). Replaced with inline SVG `Icon` component. | fixed (PR #1) |

## Bugs found by Meena

| # | Found | Area | Description | Status |
|---|-------|------|-------------|--------|
| M1 | 2026-09-16 | UI | After the game ended, the opponent's ship positions were not shown. Cause: the game-over modal was a full-screen dark overlay that covered the boards; the reveal only appeared after clicking a small "View boards" button, and surviving enemy ships were drawn in the same grey as your own fleet. Fix: replaced the overlay with an inline result card above the boards so the enemy board is always visible, surviving enemy ships are drawn in red with a surfacing animation, the enemy board header reads "Fleet revealed — N escaped", and `App.test.tsx` plays a full game and asserts all 5 enemy ships are rendered at game over. | fixed (run 3) |
| M2 | 2026-09-16 | UI | After the M1 fix the Defeat/Victory screen was a flat card at the top of the page and no longer offered the scoreboard pop-up from the original design. Fix: the game-over scoreboard is a pop-up again (`role=dialog`, opens automatically at game over) with Shots / Accuracy / Ships sunk / Ships lost, **View boards** and **Play again**. The boards behind it are already revealed (M1 stays fixed); "View boards" closes the pop-up to a compact result bar whose **Scoreboard** button reopens it. `App.test.tsx` asserts the dialog, its stats, dismiss and reopen. | fixed (run 4) |
| M3 | 2026-09-16 | UI | When firing at the enemy fleet a hit only showed a red ✕ and "You hit something" — no way to tell which ship was hit or how many squares were left, so the player had to guess the ship length. Fix: the status bar now reads e.g. "You hit the enemy Cruiser at C4! (1 of 3)", the hit cell shows a ship-coloured badge (tooltip/aria-label name the ship), and the enemy fleet tracker highlights the damaged ship with a matching colour and a `hit 1/3` progress tag until it sinks. Ship positions stay hidden until sunk/game over. New test in `App.test.tsx`. | fixed (run 4) |
