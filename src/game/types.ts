export const BOARD_SIZE = 10

export type Orientation = 'h' | 'v'

export interface Coord {
  x: number
  y: number
}

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer'

export interface ShipSpec {
  name: ShipName
  length: number
}

export const FLEET: readonly ShipSpec[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
]

export interface Ship extends ShipSpec {
  /** Bow (top-left) cell. */
  origin: Coord
  orientation: Orientation
  /** Segment indices (0..length-1) that have been hit. */
  hits: readonly number[]
}

export type CellState = 'water' | 'miss' | 'hit'

export interface Board {
  /** cells[y][x] */
  cells: readonly (readonly CellState[])[]
  ships: readonly Ship[]
}

export type ShotResult =
  | { kind: 'miss' }
  | { kind: 'hit'; ship: ShipName }
  | { kind: 'sunk'; ship: ShipName }
  | { kind: 'invalid' }

export type Difficulty = 'easy' | 'normal' | 'hard'

export type Player = 'player' | 'ai'
