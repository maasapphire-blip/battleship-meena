# Bugs

Status: `open` · `fixed (<commit/PR>)` · `wontfix`

## Bugs found by Devin

| # | Found | Area | Description | Status |
|---|-------|------|-------------|--------|
| D1 | 2026-09-15 | UI | Difficulty selector offers Normal/Hard but both currently run the Easy (random) AI — M9 not implemented yet. Tracked in progress.md, listed here so it is not forgotten. | open |
| D2 | 2026-09-15 | tests | `useMediaQuery` crashed under jsdom (`window.matchMedia is not a function`); guarded with a `typeof === 'function'` check. | fixed (run 1) |
| D3 | 2026-09-15 | UI | Emoji icons (⚓ 🎲 🔥 🏆 💥) rendered as empty boxes on systems without an emoji font (found during play-test on Linux). Replaced with inline SVG `Icon` component. | fixed (PR #1) |

## Bugs found by Meena

| # | Found | Area | Description | Status |
|---|-------|------|-------------|--------|
| | | | _none reported yet_ | |
