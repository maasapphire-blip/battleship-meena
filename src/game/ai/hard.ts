import { inBounds } from '../board'
import { coordKey, makeShip, shipCells } from '../ships'
import { BOARD_SIZE, FLEET } from '../types'
import type { Coord, Orientation, Ship } from '../types'
import type { Ai, EnemyView } from './common'
import { isUntried, pickCoord } from './common'
import { nextInt } from './rng'
import type { Rng } from './rng'
import type { TargetMemory } from './target'
import { emptyTargetMemory, trackResult } from './target'

/**
 * Hard: probability density.
 * Every turn, for each remaining ship, enumerate all placements consistent with
 * the view (in bounds, no miss, no cell of an already-sunk ship). Each placement
 * adds weight to the untried cells it covers. When there are open hits, only
 * placements covering at least one count, and covering more counts
 * exponentially more. Fire at the hottest cell; ties broken by RNG.
 */
export function heatMap(view: EnemyView, memory: TargetMemory): number[][] {
  const heat = density(view, memory, memory.openHits.length > 0)
  return heat.some((row) => row.some((h) => h > 0)) ? heat : density(view, memory, false)
}

function density(view: EnemyView, memory: TargetMemory, targeting: boolean): number[][] {
  const heat: number[][] = Array.from({ length: BOARD_SIZE }, () => Array<number>(BOARD_SIZE).fill(0))
  const blocked = new Set(memory.sunkCells.map(coordKey))
  const open = new Set(memory.openHits.map(coordKey))

  for (const spec of view.remaining) {
    for (const orientation of ['h', 'v'] as const) {
      const maxX = orientation === 'h' ? BOARD_SIZE - spec.length : BOARD_SIZE - 1
      const maxY = orientation === 'v' ? BOARD_SIZE - spec.length : BOARD_SIZE - 1
      for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
          const cells = shipCells({ origin: { x, y }, orientation, length: spec.length })
          let covered = 0
          let legal = true
          for (const c of cells) {
            const key = coordKey(c)
            if (view.cells[c.y][c.x] === 'miss' || blocked.has(key)) {
              legal = false
              break
            }
            if (open.has(key)) covered++
          }
          if (!legal) continue
          if (targeting && covered === 0) continue
          const weight = targeting ? 2 ** covered : 1
          for (const c of cells) {
            if (view.cells[c.y][c.x] === 'unknown') heat[c.y][c.x] += weight
          }
        }
      }
    }
  }
  return heat
}

export function hottestCells(view: EnemyView, heat: number[][]): Coord[] {
  let best = -1
  let cells: Coord[] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!isUntried(view, { x, y })) continue
      const h = heat[y][x]
      if (h > best) {
        best = h
        cells = [{ x, y }]
      } else if (h === best) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

function touchesAny(ships: readonly Ship[], cells: readonly Coord[]): boolean {
  const occupied = new Set(ships.flatMap((s) => shipCells(s).map(coordKey)))
  return cells.some((c) =>
    [c, ...[-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ x: c.x + dx, y: c.y + dy })))].some(
      (n) => inBounds(n) && occupied.has(coordKey(n)),
    ),
  )
}

/** Random fleet where no two ships touch (not even diagonally). */
export function spacedFleet(rng: Rng): [Ship[], Rng] {
  for (;;) {
    let ships: Ship[] = []
    let r = rng
    let ok = true
    for (const spec of FLEET) {
      let placed = false
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const [o, r1] = nextInt(r, 2)
        const orientation: Orientation = o === 0 ? 'h' : 'v'
        const [x, r2] = nextInt(r1, BOARD_SIZE)
        const [y, r3] = nextInt(r2, BOARD_SIZE)
        r = r3
        const ship = makeShip(spec, { x, y }, orientation)
        const cells = shipCells(ship)
        if (cells.every(inBounds) && !touchesAny(ships, cells)) {
          ships = [...ships, ship]
          placed = true
        }
      }
      if (!placed) {
        ok = false
        break
      }
    }
    rng = r
    if (ok) return [ships, r]
  }
}

export const hardAi: Ai<TargetMemory> = {
  initialMemory: emptyTargetMemory,
  placeFleet: spacedFleet,
  chooseShot(view, memory, rng) {
    return pickCoord(rng, hottestCells(view, heatMap(view, memory)))
  },
  onResult: trackResult,
}
