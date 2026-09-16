import { coordKey, coordsEqual } from '../ships'
import type { Coord, ShipSpec, ShotResult } from '../types'
import type { EnemyView } from './common'
import { isUntried, neighbors } from './common'

/**
 * Bookkeeping shared by the Normal and Hard AIs: which hit cells have not yet
 * been attributed to a sunk ship ("open hits"), and which have.
 *
 * The view never says which cells a sunk ship occupied, so when a shot sinks a
 * ship we attribute the `length` contiguous hits through the sinking shot on
 * whichever axis has a long enough run — exactly the inference a human makes.
 */
export interface TargetMemory {
  openHits: readonly Coord[]
  sunkCells: readonly Coord[]
}

export const emptyTargetMemory: TargetMemory = { openHits: [], sunkCells: [] }

function has(list: readonly Coord[], c: Coord): boolean {
  return list.some((o) => coordsEqual(o, c))
}

function runThrough(open: readonly Coord[], at: Coord, axis: 'h' | 'v'): Coord[] {
  const step = axis === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 }
  const run: Coord[] = [at]
  for (const dir of [1, -1]) {
    let c = { x: at.x + dir * step.x, y: at.y + dir * step.y }
    while (has(open, c)) {
      if (dir === 1) run.push(c)
      else run.unshift(c)
      c = { x: c.x + dir * step.x, y: c.y + dir * step.y }
    }
  }
  return run
}

/** Attributes `ship.length` open hits through `at` to the sunk ship. */
export function attributeSunk(memory: TargetMemory, at: Coord, ship: ShipSpec): TargetMemory {
  const open = has(memory.openHits, at) ? memory.openHits : [...memory.openHits, at]
  const h = runThrough(open, at, 'h')
  const v = runThrough(open, at, 'v')
  const candidates = [h, v].filter((r) => r.length >= ship.length)
  const run = candidates.length > 0 ? candidates.sort((a, b) => a.length - b.length)[0] : h.length >= v.length ? h : v
  const idx = run.findIndex((c) => coordsEqual(c, at))
  const start = Math.max(0, Math.min(idx - Math.floor(ship.length / 2), run.length - ship.length))
  const sunk = run.slice(start, start + ship.length)
  return {
    openHits: open.filter((c) => !has(sunk, c)),
    sunkCells: [...memory.sunkCells, ...sunk],
  }
}

export function recordHit(memory: TargetMemory, at: Coord): TargetMemory {
  if (has(memory.openHits, at)) return memory
  return { ...memory, openHits: [...memory.openHits, at] }
}

/** `Ai.onResult` for strategies that track open hits. */
export function trackResult(
  result: ShotResult,
  coord: Coord,
  view: EnemyView,
  memory: TargetMemory,
): TargetMemory {
  switch (result.kind) {
    case 'hit':
      return recordHit(memory, coord)
    case 'sunk': {
      const spec = view.sunk.find((s) => s.name === result.ship)
      return spec ? attributeSunk(memory, coord, spec) : recordHit(memory, coord)
    }
    default:
      return memory
  }
}

/**
 * Candidate cells to finish off the open hits: with two or more aligned hits,
 * the untried cells just beyond each end of the run; otherwise every untried
 * neighbour of every open hit.
 */
export function targetCandidates(view: EnemyView, memory: TargetMemory): Coord[] {
  const { openHits } = memory
  if (openHits.length === 0) return []
  const out = new Map<string, Coord>()
  const add = (c: Coord) => {
    if (c.x >= 0 && c.x < view.cells.length && c.y >= 0 && c.y < view.cells.length && isUntried(view, c)) {
      out.set(coordKey(c), c)
    }
  }
  for (const hit of openHits) {
    for (const axis of ['h', 'v'] as const) {
      const run = runThrough(openHits, hit, axis)
      if (run.length < 2) continue
      const step = axis === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 }
      add({ x: run[0].x - step.x, y: run[0].y - step.y })
      const last = run[run.length - 1]
      add({ x: last.x + step.x, y: last.y + step.y })
    }
  }
  if (out.size === 0) {
    for (const hit of openHits) neighbors(hit).forEach(add)
  }
  return [...out.values()]
}
