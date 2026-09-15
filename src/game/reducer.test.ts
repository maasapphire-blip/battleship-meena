import { describe, expect, it } from 'vitest'
import { shipCells } from './ships'
import { FLEET } from './types'
import { allShipsPlaced, createGame, gameReducer } from './reducer'
import type { GameState } from './reducer'

function placedGame(seed = 1): GameState {
  const s = gameReducer(createGame(seed), { type: 'RANDOMIZE' })
  expect(allShipsPlaced(s)).toBe(true)
  return s
}

describe('placement phase', () => {
  it('starts in placing with an enemy fleet and an empty player board', () => {
    const s = createGame(1)
    expect(s.phase).toBe('placing')
    expect(s.enemy.ships).toHaveLength(5)
    expect(s.player.ships).toHaveLength(0)
    expect(s.placing).toEqual({ shipIndex: 0, orientation: 'h' })
  })

  it('places ships in fleet order and advances to the next unplaced ship', () => {
    let s = createGame(1)
    s = gameReducer(s, { type: 'PLACE_SHIP', at: { x: 0, y: 0 } })
    expect(s.player.ships[0].name).toBe('Carrier')
    expect(s.placing.shipIndex).toBe(1)
    s = gameReducer(s, { type: 'ROTATE' })
    s = gameReducer(s, { type: 'PLACE_SHIP', at: { x: 0, y: 1 } })
    expect(s.player.ships[1]).toMatchObject({ name: 'Battleship', orientation: 'v' })
    expect(s.placing.shipIndex).toBe(2)
  })

  it('ignores invalid placements', () => {
    let s = createGame(1)
    s = gameReducer(s, { type: 'PLACE_SHIP', at: { x: 0, y: 0 } })
    const before = s
    s = gameReducer(s, { type: 'PLACE_SHIP', at: { x: 2, y: 0 } }) // overlaps carrier
    expect(s).toBe(before)
    s = gameReducer(s, { type: 'PLACE_SHIP', at: { x: 8, y: 0 } }) // out of bounds
    expect(s).toBe(before)
  })

  it('pick up, select, clear and randomize', () => {
    let s = placedGame()
    s = gameReducer(s, { type: 'PICK_UP_SHIP', name: 'Cruiser' })
    expect(s.player.ships).toHaveLength(4)
    expect(FLEET[s.placing.shipIndex].name).toBe('Cruiser')
    s = gameReducer(s, { type: 'SELECT_SHIP', index: 4 })
    expect(s.placing.shipIndex).toBe(4)
    s = gameReducer(s, { type: 'SELECT_SHIP', index: 99 })
    expect(s.placing.shipIndex).toBe(4)
    s = gameReducer(s, { type: 'CLEAR' })
    expect(s.player.ships).toHaveLength(0)
    s = gameReducer(s, { type: 'RANDOMIZE' })
    expect(s.player.ships).toHaveLength(5)
  })

  it('SET_DIFFICULTY re-places the enemy fleet only during placement', () => {
    let s = createGame(1)
    s = gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'hard' })
    expect(s.difficulty).toBe('hard')
    const started = gameReducer(placedGame(), { type: 'START' })
    expect(gameReducer(started, { type: 'SET_DIFFICULTY', difficulty: 'easy' })).toBe(started)
  })

  it('START requires all ships placed', () => {
    const s = createGame(1)
    expect(gameReducer(s, { type: 'START' })).toBe(s)
    const started = gameReducer(placedGame(), { type: 'START' })
    expect(started.phase).toBe('playing')
    expect(started.turn).toBe('player')
  })

  it('battle actions are no-ops during placement', () => {
    const s = placedGame()
    expect(gameReducer(s, { type: 'FIRE', at: { x: 0, y: 0 } })).toBe(s)
    expect(gameReducer(s, { type: 'AI_FIRE' })).toBe(s)
  })
})

describe('battle phase', () => {
  const started = gameReducer(placedGame(), { type: 'START' })

  it('player fire alternates the turn and records the event', () => {
    const s = gameReducer(started, { type: 'FIRE', at: { x: 0, y: 0 } })
    expect(s.turn).toBe('ai')
    expect(s.lastEvent?.by).toBe('player')
    expect(s.lastEvent?.coord).toEqual({ x: 0, y: 0 })
    expect(gameReducer(s, { type: 'FIRE', at: { x: 1, y: 1 } })).toBe(s) // not player's turn
  })

  it('repeated shots are ignored and do not change turn', () => {
    const s1 = gameReducer(started, { type: 'FIRE', at: { x: 0, y: 0 } })
    const s2 = gameReducer(s1, { type: 'AI_FIRE' })
    expect(s2.turn).toBe('player')
    expect(gameReducer(s2, { type: 'FIRE', at: { x: 0, y: 0 } })).toBe(s2)
  })

  it('AI fire returns the turn to the player and updates the player board', () => {
    const s1 = gameReducer(started, { type: 'FIRE', at: { x: 0, y: 0 } })
    const s2 = gameReducer(s1, { type: 'AI_FIRE' })
    expect(s2.turn).toBe('player')
    expect(s2.lastEvent?.by).toBe('ai')
    expect(s2.player.cells.flat().filter((c) => c !== 'water')).toHaveLength(1)
    expect(gameReducer(started, { type: 'AI_FIRE' })).toBe(started) // not AI's turn
  })

  it('placement actions are no-ops during battle', () => {
    expect(gameReducer(started, { type: 'ROTATE' })).toBe(started)
    expect(gameReducer(started, { type: 'PLACE_SHIP', at: { x: 0, y: 0 } })).toBe(started)
    expect(gameReducer(started, { type: 'RANDOMIZE' })).toBe(started)
    expect(gameReducer(started, { type: 'CLEAR' })).toBe(started)
    expect(gameReducer(started, { type: 'START' })).toBe(started)
  })

  it('player wins by sinking every enemy ship', () => {
    let s = started
    for (const ship of started.enemy.ships) {
      for (const c of shipCells(ship)) {
        s = gameReducer(s, { type: 'FIRE', at: c })
        if (s.phase === 'playing') s = gameReducer(s, { type: 'AI_FIRE' })
      }
    }
    expect(s.phase).toBe('over')
    expect(s.winner).toBe('player')
    expect(gameReducer(s, { type: 'FIRE', at: { x: 9, y: 9 } })).toBe(s)
  })

  it('AI wins when it sinks the player fleet', () => {
    // Build a board where every cell has been fired except the last segment of the last ship.
    const ships = started.player.ships
    const last = ships[ships.length - 1]
    const lastCell = shipCells(last)[last.length - 1]
    const shipKeys = new Set(ships.flatMap((sh) => shipCells(sh).map((c) => `${c.x},${c.y}`)))
    const cells = started.player.cells.map((row, y) =>
      row.map((_, x) => {
        if (x === lastCell.x && y === lastCell.y) return 'water' as const
        return shipKeys.has(`${x},${y}`) ? ('hit' as const) : ('miss' as const)
      }),
    )
    const hitShips = ships.map((sh) =>
      sh.name === last.name
        ? { ...sh, hits: Array.from({ length: sh.length - 1 }, (_, i) => i) }
        : { ...sh, hits: Array.from({ length: sh.length }, (_, i) => i) },
    )
    const s0: GameState = { ...started, player: { cells, ships: hitShips }, turn: 'ai' }
    const s = gameReducer(s0, { type: 'AI_FIRE' })
    expect(s.lastEvent?.result).toEqual({ kind: 'sunk', ship: last.name })
    expect(s.phase).toBe('over')
    expect(s.winner).toBe('ai')
    expect(gameReducer(s, { type: 'AI_FIRE' })).toBe(s)
  })

  it('RESET starts a fresh game with a new seed, keeping difficulty', () => {
    const s = gameReducer(started, { type: 'SET_DIFFICULTY', difficulty: 'hard' })
    const r = gameReducer({ ...s, difficulty: 'hard' }, { type: 'RESET' })
    expect(r.phase).toBe('placing')
    expect(r.difficulty).toBe('hard')
    expect(r.player.ships).toHaveLength(0)
  })
})

describe('full simulated games', () => {
  it('terminate with a winner for many seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      let s = gameReducer(gameReducer(createGame(seed, 'easy'), { type: 'RANDOMIZE' }), { type: 'START' })
      let guard = 0
      while (s.phase === 'playing' && guard++ < 250) {
        // player also shoots randomly using untried cells in scan order
        let target = { x: 0, y: 0 }
        const order = (seed * 7 + guard) % 100
        for (let i = 0; i < 100; i++) {
          const idx = (order + i) % 100
          const x = idx % 10
          const y = Math.floor(idx / 10)
          if (s.enemy.cells[y][x] === 'water') {
            target = { x, y }
            break
          }
        }
        s = gameReducer(s, { type: 'FIRE', at: target })
        if (s.phase === 'playing') s = gameReducer(s, { type: 'AI_FIRE' })
      }
      expect(s.phase).toBe('over')
      expect(s.winner).toBeDefined()
    }
  })
})
