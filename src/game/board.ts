import { coordsEqual, isSunk, segmentAt, shipCells } from './ships'
import { BOARD_SIZE } from './types'
import type { Board, CellState, Coord, Ship, ShotResult } from './types'

export function createBoard(ships: readonly Ship[] = []): Board {
  const cells: CellState[][] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    cells.push(new Array<CellState>(BOARD_SIZE).fill('water'))
  }
  return { cells, ships }
}

export function inBounds(c: Coord): boolean {
  return c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE
}

export function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((s) => segmentAt(s, coord) >= 0)
}

export function canPlace(
  board: Board,
  ship: Pick<Ship, 'origin' | 'orientation' | 'length'>,
  ignoreShipName?: string,
): boolean {
  const cells = shipCells(ship)
  if (!cells.every(inBounds)) return false
  return cells.every((c) => {
    const other = shipAt(board, c)
    return other === undefined || other.name === ignoreShipName
  })
}

export function placeShip(board: Board, ship: Ship): Board {
  if (!canPlace(board, ship, ship.name)) {
    throw new Error(`Cannot place ${ship.name} at ${ship.origin.x},${ship.origin.y}`)
  }
  const ships = board.ships.filter((s) => s.name !== ship.name)
  return { ...board, ships: [...ships, ship] }
}

export function removeShip(board: Board, name: string): Board {
  return { ...board, ships: board.ships.filter((s) => s.name !== name) }
}

export function cellState(board: Board, c: Coord): CellState {
  return board.cells[c.y][c.x]
}

export function fire(board: Board, coord: Coord): { board: Board; result: ShotResult } {
  if (!inBounds(coord) || cellState(board, coord) !== 'water') {
    return { board, result: { kind: 'invalid' } }
  }
  const target = shipAt(board, coord)
  const newState: CellState = target ? 'hit' : 'miss'
  const cells = board.cells.map((row, y) =>
    y === coord.y ? row.map((s, x) => (x === coord.x ? newState : s)) : row,
  )
  if (!target) {
    return { board: { ...board, cells }, result: { kind: 'miss' } }
  }
  const seg = segmentAt(target, coord)
  const updated: Ship = { ...target, hits: [...target.hits, seg] }
  const ships = board.ships.map((s) => (s.name === target.name ? updated : s))
  const result: ShotResult = isSunk(updated)
    ? { kind: 'sunk', ship: updated.name }
    : { kind: 'hit', ship: updated.name }
  return { board: { cells, ships }, result }
}

export function shotsFired(board: Board): number {
  return board.cells.flat().filter((s) => s !== 'water').length
}

export function hitsOn(board: Board): number {
  return board.cells.flat().filter((s) => s === 'hit').length
}

export function isShipCell(ship: Ship, coord: Coord): boolean {
  return shipCells(ship).some((c) => coordsEqual(c, coord))
}
