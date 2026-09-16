import { describe, expect, it } from 'vitest'
import { createBoard, fire } from '../board'
import { coordKey, makeShip, shipCells } from '../ships'
import { FLEET } from '../types'
import type { Board, Coord, Ship } from '../types'
import type { Ai } from './common'
import { randomFleet, viewOf } from './common'
import { coordsOf } from './ai.test'
import { easyAi } from './easy'
import { hardAi, heatMap, hottestCells, spacedFleet } from './hard'
import { AIS } from './index'
import { normalAi } from './normal'
import { createRng } from './rng'
import { attributeSunk, emptyTargetMemory, targetCandidates } from './target'

function playOut<M>(ai: Ai<M>, ships: readonly Ship[], seed: number): number {
  let rng = createRng(seed)
  let board = createBoard(ships)
  let memory = ai.initialMemory
  const seen = new Set<string>()
  let shots = 0
  while (board.ships.some((s) => s.hits.length < s.length)) {
    const [coord, r] = ai.chooseShot(viewOf(board), memory, rng)
    rng = r
    expect(seen.has(coordKey(coord))).toBe(false)
    seen.add(coordKey(coord))
    const res = fire(board, coord)
    expect(res.result.kind).not.toBe('invalid')
    board = res.board
    memory = ai.onResult(res.result, coord, viewOf(board), memory)
    shots++
    if (shots > 100) throw new Error('did not finish in 100 shots')
  }
  return shots
}

function fireAll(board: Board, coords: Coord[]): Board {
  return coords.reduce((b, c) => fire(b, c).board, board)
}

describe('target memory', () => {
  it('after one hit, candidates are its untried neighbours', () => {
    const board = fireAll(createBoard([makeShip(FLEET[2], { x: 4, y: 4 }, 'h')]), [{ x: 4, y: 4 }])
    const mem = { ...emptyTargetMemory, openHits: [{ x: 4, y: 4 }] }
    expect(coordsOf(targetCandidates(viewOf(board), mem)).sort()).toEqual(['3,4', '4,3', '4,5', '5,4'])
  })

  it('after two aligned hits, candidates are only the run ends', () => {
    const board = fireAll(createBoard([makeShip(FLEET[0], { x: 2, y: 4 }, 'h')]), [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ])
    const mem = { ...emptyTargetMemory, openHits: [{ x: 4, y: 4 }, { x: 5, y: 4 }] }
    expect(coordsOf(targetCandidates(viewOf(board), mem)).sort()).toEqual(['3,4', '6,4'])
  })

  it('attributes a sunk ship to the aligned run and keeps other hits open', () => {
    const mem = {
      ...emptyTargetMemory,
      openHits: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 5 }],
    }
    const next = attributeSunk(mem, { x: 6, y: 4 }, FLEET[2])
    expect(coordsOf([...next.sunkCells]).sort()).toEqual(['4,4', '5,4', '6,4'])
    expect(coordsOf([...next.openHits])).toEqual(['4,5'])
  })
})

describe('normalAi', () => {
  it('hunts only on checkerboard parity while there are no open hits', () => {
    let rng = createRng(3)
    const view = viewOf(createBoard())
    for (let i = 0; i < 50; i++) {
      const [c, r] = normalAi.chooseShot(view, emptyTargetMemory, rng)
      rng = r
      expect((c.x + c.y) % 2).toBe(0)
    }
  })

  it('fires adjacent to a hit', () => {
    const board = fireAll(createBoard([makeShip(FLEET[4], { x: 7, y: 7 }, 'v')]), [{ x: 7, y: 7 }])
    const mem = normalAi.onResult({ kind: 'hit', ship: 'Destroyer' }, { x: 7, y: 7 }, viewOf(board), normalAi.initialMemory)
    const [c] = normalAi.chooseShot(viewOf(board), mem, createRng(9))
    expect(['6,7', '8,7', '7,6', '7,8']).toContain(coordKey(c))
  })

  it('sinks every fleet without repeating a cell (200 seeds)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const [ships] = randomFleet(createRng(seed))
      expect(playOut(normalAi, ships, seed)).toBeGreaterThanOrEqual(17)
    }
  })
})

describe('hardAi', () => {
  it('places a fleet where no ships touch', () => {
    for (let seed = 0; seed < 200; seed++) {
      const [ships] = spacedFleet(createRng(seed))
      expect(ships).toHaveLength(FLEET.length)
      const occupied = new Set(ships.flatMap((s) => shipCells(s).map(coordKey)))
      expect(occupied.size).toBe(17)
      for (const ship of ships) {
        for (const c of shipCells(ship)) {
          for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
              const n = { x: c.x + dx, y: c.y + dy }
              if (!occupied.has(coordKey(n))) continue
              const owner = ships.find((s) => shipCells(s).some((sc) => coordKey(sc) === coordKey(n)))
              expect(owner?.name).toBe(ship.name)
            }
          }
        }
      }
    }
  })

  it('picks the inner cells of a 4-cell gap when only the Cruiser remains', () => {
    const cruiser = makeShip(FLEET[2], { x: 3, y: 5 }, 'h')
    let board = createBoard([cruiser])
    const misses: Coord[] = []
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (y !== 5 || x < 3 || x > 6) misses.push({ x, y })
      }
    }
    board = fireAll(board, misses)
    const view = viewOf(board)
    const cells = hottestCells(view, heatMap(view, emptyTargetMemory))
    expect(coordsOf(cells).sort()).toEqual(['4,5', '5,5'])
  })

  it('concentrates on cells adjacent to open hits', () => {
    const board = fireAll(createBoard([makeShip(FLEET[1], { x: 2, y: 2 }, 'h')]), [{ x: 3, y: 2 }])
    const mem = hardAi.onResult({ kind: 'hit', ship: 'Battleship' }, { x: 3, y: 2 }, viewOf(board), hardAi.initialMemory)
    const view = viewOf(board)
    const heat = heatMap(view, mem)
    expect(heat[2][2]).toBeGreaterThan(0)
    expect(heat[2][4]).toBeGreaterThan(0)
    expect(heat[9][9]).toBe(0)
  })

  it('sinks every fleet without repeating a cell (100 seeds)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const [ships] = randomFleet(createRng(seed))
      expect(playOut(hardAi, ships, seed)).toBeGreaterThanOrEqual(17)
    }
  })
})

describe('difficulty registry', () => {
  it('maps each difficulty to its own strategy', () => {
    expect(AIS.easy).toBe(easyAi)
    expect(AIS.normal).toBe(normalAi)
    expect(AIS.hard).toBe(hardAi)
  })
})

describe('difficulty ordering', () => {
  it('over a fixed seed set, Hard needs fewer shots than Normal, which needs fewer than Easy', () => {
    const total = { easy: 0, normal: 0, hard: 0 }
    for (let seed = 1000; seed < 1060; seed++) {
      const [ships] = randomFleet(createRng(seed))
      total.easy += playOut(easyAi, ships, seed)
      total.normal += playOut(normalAi, ships, seed)
      total.hard += playOut(hardAi, ships, seed)
    }
    expect(total.hard).toBeLessThan(total.normal)
    expect(total.normal).toBeLessThan(total.easy)
  })
})
