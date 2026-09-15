import { describe, expect, it } from 'vitest'
import { canPlace, createBoard, fire, placeShip, removeShip, shipAt, shotsFired } from './board'
import { allSunk, isSunk, makeShip, segmentAt, shipCells } from './ships'
import { FLEET } from './types'

const destroyer = FLEET[4]
const cruiser = FLEET[2]

describe('shipCells / segmentAt', () => {
  it('lists horizontal and vertical cells', () => {
    expect(shipCells(makeShip(cruiser, { x: 2, y: 3 }, 'h'))).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ])
    expect(shipCells(makeShip(cruiser, { x: 2, y: 3 }, 'v'))).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ])
  })

  it('returns segment index or -1', () => {
    const s = makeShip(cruiser, { x: 2, y: 3 }, 'h')
    expect(segmentAt(s, { x: 4, y: 3 })).toBe(2)
    expect(segmentAt(s, { x: 5, y: 3 })).toBe(-1)
    expect(segmentAt(s, { x: 2, y: 4 })).toBe(-1)
  })
})

describe('canPlace / placeShip', () => {
  it('accepts in-bounds, non-overlapping placements', () => {
    const board = createBoard()
    expect(canPlace(board, makeShip(destroyer, { x: 8, y: 0 }, 'h'))).toBe(true)
    expect(canPlace(board, makeShip(destroyer, { x: 0, y: 8 }, 'v'))).toBe(true)
  })

  it('rejects out-of-bounds placements', () => {
    const board = createBoard()
    expect(canPlace(board, makeShip(destroyer, { x: 9, y: 0 }, 'h'))).toBe(false)
    expect(canPlace(board, makeShip(destroyer, { x: 0, y: 9 }, 'v'))).toBe(false)
    expect(canPlace(board, makeShip(destroyer, { x: -1, y: 0 }, 'h'))).toBe(false)
  })

  it('rejects overlapping placements but allows touching', () => {
    const board = placeShip(createBoard(), makeShip(cruiser, { x: 2, y: 2 }, 'h'))
    expect(canPlace(board, makeShip(destroyer, { x: 3, y: 1 }, 'v'))).toBe(false)
    expect(canPlace(board, makeShip(destroyer, { x: 2, y: 3 }, 'h'))).toBe(true)
  })

  it('placeShip is immutable and replaces a ship of the same name', () => {
    const b0 = createBoard()
    const b1 = placeShip(b0, makeShip(cruiser, { x: 0, y: 0 }, 'h'))
    const b2 = placeShip(b1, makeShip(cruiser, { x: 5, y: 5 }, 'v'))
    expect(b0.ships).toHaveLength(0)
    expect(b1.ships).toHaveLength(1)
    expect(b2.ships).toHaveLength(1)
    expect(b2.ships[0].origin).toEqual({ x: 5, y: 5 })
    expect(placeShip(b2, makeShip(destroyer, { x: 5, y: 4 }, 'h')).ships).toHaveLength(2)
  })

  it('placeShip throws on invalid placement', () => {
    const board = placeShip(createBoard(), makeShip(cruiser, { x: 2, y: 2 }, 'h'))
    expect(() => placeShip(board, makeShip(destroyer, { x: 3, y: 2 }, 'h'))).toThrow()
  })

  it('removeShip removes by name', () => {
    const board = placeShip(createBoard(), makeShip(cruiser, { x: 2, y: 2 }, 'h'))
    expect(removeShip(board, 'Cruiser').ships).toHaveLength(0)
    expect(shipAt(board, { x: 3, y: 2 })?.name).toBe('Cruiser')
  })
})

describe('fire', () => {
  const board = placeShip(createBoard(), makeShip(destroyer, { x: 4, y: 4 }, 'h'))

  it('records a miss', () => {
    const { board: b, result } = fire(board, { x: 0, y: 0 })
    expect(result).toEqual({ kind: 'miss' })
    expect(b.cells[0][0]).toBe('miss')
    expect(board.cells[0][0]).toBe('water')
    expect(shotsFired(b)).toBe(1)
  })

  it('records a hit and then a sunk', () => {
    const r1 = fire(board, { x: 4, y: 4 })
    expect(r1.result).toEqual({ kind: 'hit', ship: 'Destroyer' })
    expect(r1.board.cells[4][4]).toBe('hit')
    expect(r1.board.ships[0].hits).toEqual([0])
    expect(isSunk(r1.board.ships[0])).toBe(false)

    const r2 = fire(r1.board, { x: 5, y: 4 })
    expect(r2.result).toEqual({ kind: 'sunk', ship: 'Destroyer' })
    expect(isSunk(r2.board.ships[0])).toBe(true)
    expect(allSunk(r2.board.ships)).toBe(true)
  })

  it('rejects repeated or out-of-bounds shots without changing the board', () => {
    const r1 = fire(board, { x: 0, y: 0 })
    const r2 = fire(r1.board, { x: 0, y: 0 })
    expect(r2.result).toEqual({ kind: 'invalid' })
    expect(r2.board).toBe(r1.board)
    expect(fire(board, { x: 10, y: 0 }).result).toEqual({ kind: 'invalid' })
  })

  it('allSunk is false for an empty fleet', () => {
    expect(allSunk([])).toBe(false)
  })
})
