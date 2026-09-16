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
| | | | _none reported yet_ | |
