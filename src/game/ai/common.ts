import { canPlace, createBoard } from '../board'
import { makeShip } from '../ships'
import { BOARD_SIZE, FLEET } from '../types'
import type { Board, Coord, Orientation, Ship, ShipSpec, ShotResult } from '../types'
import { nextInt, pick } from './rng'
import type { Rng } from './rng'

export type ViewCell = 'unknown' | 'miss' | 'hit'

/**
 * Everything an AI is allowed to know about the opponent: exactly what a human
 * player sees on the enemy grid. Ship positions are deliberately absent.
 */
export interface EnemyView {
  cells: readonly (readonly ViewCell[])[]
  sunk: readonly ShipSpec[]
  remaining: readonly ShipSpec[]
}

export interface Ai<M> {
  readonly initialMemory: M
  placeFleet(rng: Rng): [Ship[], Rng]
  chooseShot(view: EnemyView, memory: M, rng: Rng): [Coord, Rng]
  onResult(result: ShotResult, coord: Coord, view: EnemyView, memory: M): M
}

export function viewOf(board: Board): EnemyView {
  const cells = board.cells.map((row) =>
    row.map((s): ViewCell => (s === 'water' ? 'unknown' : s)),
  )
  const sunk = board.ships
    .filter((s) => s.hits.length >= s.length)
    .map(({ name, length }) => ({ name, length }))
  const remaining = board.ships
    .filter((s) => s.hits.length < s.length)
    .map(({ name, length }) => ({ name, length }))
  return { cells, sunk, remaining }
}

export function untriedCells(view: EnemyView): Coord[] {
  const out: Coord[] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (view.cells[y][x] === 'unknown') out.push({ x, y })
    }
  }
  return out
}

export function neighbors(c: Coord): Coord[] {
  return [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ].filter((n) => n.x >= 0 && n.x < BOARD_SIZE && n.y >= 0 && n.y < BOARD_SIZE)
}

export function isUntried(view: EnemyView, c: Coord): boolean {
  return view.cells[c.y][c.x] === 'unknown'
}

/** Places the standard fleet at uniformly random valid positions. */
export function randomFleet(rng: Rng): [Ship[], Rng] {
  let board = createBoard()
  let r = rng
  for (const spec of FLEET) {
    for (;;) {
      const [o, r1] = nextInt(r, 2)
      const orientation: Orientation = o === 0 ? 'h' : 'v'
      const [x, r2] = nextInt(r1, BOARD_SIZE)
      const [y, r3] = nextInt(r2, BOARD_SIZE)
      r = r3
      const ship = makeShip(spec, { x, y }, orientation)
      if (canPlace(board, ship)) {
        board = { ...board, ships: [...board.ships, ship] }
        break
      }
    }
  }
  return [[...board.ships], r]
}

export function pickCoord(rng: Rng, cells: readonly Coord[]): [Coord, Rng] {
  return pick(rng, cells)
}
