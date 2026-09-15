import { describe, expect, it } from 'vitest'
import { canPlace, createBoard, fire } from '../board'
import { shipCells } from '../ships'
import { FLEET } from '../types'
import type { Coord } from '../types'
import { randomFleet, untriedCells, viewOf } from './common'
import { easyAi } from './easy'
import { createRng, nextFloat, nextInt, pick } from './rng'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = nextFloat(createRng(42))
    const b = nextFloat(createRng(42))
    expect(a[0]).toBe(b[0])
    expect(a[1]).toEqual(b[1])
  })

  it('produces values in range', () => {
    let rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const [f, r1] = nextFloat(rng)
      const [n, r2] = nextInt(r1, 10)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(10)
      rng = r2
    }
  })

  it('pick throws on empty list', () => {
    expect(() => pick(createRng(1), [])).toThrow()
  })
})

describe('randomFleet', () => {
  it('always yields a valid, complete fleet (1000 seeds)', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const [ships] = randomFleet(createRng(seed))
      expect(ships.map((s) => s.name).sort()).toEqual(FLEET.map((s) => s.name).sort())
      let board = createBoard()
      for (const ship of ships) {
        expect(canPlace(board, ship)).toBe(true)
        board = { ...board, ships: [...board.ships, ship] }
      }
      const total = ships.reduce((n, s) => n + shipCells(s).length, 0)
      expect(total).toBe(17)
    }
  })
})

describe('easyAi', () => {
  it('never fires at the same cell twice and eventually sinks the fleet', () => {
    let rng = createRng(123)
    let ships
    ;[ships, rng] = randomFleet(rng)
    let board = createBoard(ships)
    const seen = new Set<string>()
    let memory = easyAi.initialMemory
    let shots = 0
    while (board.ships.some((s) => s.hits.length < s.length)) {
      const view = viewOf(board)
      const [coord, r] = easyAi.chooseShot(view, memory, rng)
      rng = r
      const key = `${coord.x},${coord.y}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      const res = fire(board, coord)
      expect(res.result.kind).not.toBe('invalid')
      board = res.board
      memory = easyAi.onResult(res.result, coord, viewOf(board), memory)
      shots++
      expect(shots).toBeLessThanOrEqual(100)
    }
    expect(shots).toBeGreaterThanOrEqual(17)
  })

  it('ignores hits (memory is always null)', () => {
    const view = viewOf(createBoard())
    expect(easyAi.onResult({ kind: 'hit', ship: 'Carrier' }, { x: 0, y: 0 }, view, null)).toBeNull()
  })

  it('viewOf hides ship positions', () => {
    const [ships] = randomFleet(createRng(5))
    const view = viewOf(createBoard(ships))
    expect(Object.keys(view)).toEqual(['cells', 'sunk', 'remaining'])
    expect(view.remaining).toHaveLength(5)
    expect(view.sunk).toHaveLength(0)
    expect(untriedCells(view)).toHaveLength(100)
  })
})

export function coordsOf(list: Coord[]): string[] {
  return list.map((c) => `${c.x},${c.y}`)
}
