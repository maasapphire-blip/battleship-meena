import type { Coord, Orientation, Ship } from './types'

export function shipCells(
  ship: Pick<Ship, 'origin' | 'orientation' | 'length'>,
): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < ship.length; i++) {
    cells.push(
      ship.orientation === 'h'
        ? { x: ship.origin.x + i, y: ship.origin.y }
        : { x: ship.origin.x, y: ship.origin.y + i },
    )
  }
  return cells
}

export function segmentAt(ship: Ship, coord: Coord): number {
  if (ship.orientation === 'h') {
    if (coord.y !== ship.origin.y) return -1
    const i = coord.x - ship.origin.x
    return i >= 0 && i < ship.length ? i : -1
  }
  if (coord.x !== ship.origin.x) return -1
  const i = coord.y - ship.origin.y
  return i >= 0 && i < ship.length ? i : -1
}

export function isSunk(ship: Ship): boolean {
  return ship.hits.length >= ship.length
}

export function allSunk(ships: readonly Ship[]): boolean {
  return ships.length > 0 && ships.every(isSunk)
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y
}

export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`
}

export function makeShip(
  spec: Pick<Ship, 'name' | 'length'>,
  origin: Coord,
  orientation: Orientation,
): Ship {
  return { ...spec, origin, orientation, hits: [] }
}
