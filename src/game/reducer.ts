import { AIS } from './ai'
import type { AiMemory } from './ai'
import { randomFleet, viewOf } from './ai/common'
import { createRng } from './ai/rng'
import type { Rng } from './ai/rng'
import { canPlace, createBoard, fire, placeShip, removeShip } from './board'
import { allSunk, makeShip } from './ships'
import { FLEET } from './types'
import type { Board, Coord, Difficulty, Orientation, Player, ShipName, ShotResult } from './types'

export type Phase = 'placing' | 'playing' | 'over'

export interface ShotEvent {
  by: Player
  coord: Coord
  result: Exclude<ShotResult, { kind: 'invalid' }>
}

export interface GameState {
  phase: Phase
  difficulty: Difficulty
  player: Board
  enemy: Board
  placing: { shipIndex: number; orientation: Orientation }
  turn: Player
  lastEvent?: ShotEvent
  winner?: Player
  aiMemory: AiMemory
  rng: Rng
}

export type Action =
  | { type: 'PLACE_SHIP'; at: Coord }
  | { type: 'PICK_UP_SHIP'; name: ShipName }
  | { type: 'SELECT_SHIP'; index: number }
  | { type: 'ROTATE' }
  | { type: 'RANDOMIZE' }
  | { type: 'CLEAR' }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'START' }
  | { type: 'FIRE'; at: Coord }
  | { type: 'AI_FIRE' }
  | { type: 'RESET'; seed?: number }

export function createGame(seed: number, difficulty: Difficulty = 'normal'): GameState {
  const rng0 = createRng(seed)
  const [enemyShips, rng] = AIS[difficulty].placeFleet(rng0)
  return {
    phase: 'placing',
    difficulty,
    player: createBoard(),
    enemy: createBoard(enemyShips),
    placing: { shipIndex: 0, orientation: 'h' },
    turn: 'player',
    aiMemory: AIS[difficulty].initialMemory,
    rng,
  }
}

export function currentShipSpec(state: GameState) {
  return FLEET[state.placing.shipIndex]
}

export function allShipsPlaced(state: GameState): boolean {
  return state.player.ships.length === FLEET.length
}

function nextUnplacedIndex(board: Board, from = 0): number {
  for (let i = 0; i < FLEET.length; i++) {
    const idx = (from + i) % FLEET.length
    if (!board.ships.some((s) => s.name === FLEET[idx].name)) return idx
  }
  return from
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'RESET':
      return createGame(action.seed ?? state.rng.seed + 1, state.difficulty)

    case 'SET_DIFFICULTY': {
      if (state.phase !== 'placing') return state
      const [enemyShips, rng] = AIS[action.difficulty].placeFleet(state.rng)
      return {
        ...state,
        difficulty: action.difficulty,
        enemy: createBoard(enemyShips),
        aiMemory: AIS[action.difficulty].initialMemory,
        rng,
      }
    }

    case 'ROTATE':
      if (state.phase !== 'placing') return state
      return {
        ...state,
        placing: { ...state.placing, orientation: state.placing.orientation === 'h' ? 'v' : 'h' },
      }

    case 'SELECT_SHIP':
      if (state.phase !== 'placing' || action.index < 0 || action.index >= FLEET.length) return state
      return { ...state, placing: { ...state.placing, shipIndex: action.index } }

    case 'PLACE_SHIP': {
      if (state.phase !== 'placing' || allShipsPlaced(state)) return state
      const spec = currentShipSpec(state)
      if (state.player.ships.some((s) => s.name === spec.name)) return state
      const ship = makeShip(spec, action.at, state.placing.orientation)
      if (!canPlace(state.player, ship)) return state
      const player = placeShip(state.player, ship)
      return {
        ...state,
        player,
        placing: { ...state.placing, shipIndex: nextUnplacedIndex(player, state.placing.shipIndex) },
      }
    }

    case 'PICK_UP_SHIP': {
      if (state.phase !== 'placing') return state
      const ship = state.player.ships.find((s) => s.name === action.name)
      if (!ship) return state
      return {
        ...state,
        player: removeShip(state.player, action.name),
        placing: {
          shipIndex: FLEET.findIndex((s) => s.name === action.name),
          orientation: ship.orientation,
        },
      }
    }

    case 'RANDOMIZE': {
      if (state.phase !== 'placing') return state
      const [ships, rng] = randomFleet(state.rng)
      return { ...state, player: createBoard(ships), rng, placing: { ...state.placing, shipIndex: 0 } }
    }

    case 'CLEAR':
      if (state.phase !== 'placing') return state
      return { ...state, player: createBoard(), placing: { shipIndex: 0, orientation: 'h' } }

    case 'START':
      if (state.phase !== 'placing' || !allShipsPlaced(state)) return state
      return { ...state, phase: 'playing', turn: 'player', lastEvent: undefined }

    case 'FIRE': {
      if (state.phase !== 'playing' || state.turn !== 'player') return state
      const { board, result } = fire(state.enemy, action.at)
      if (result.kind === 'invalid') return state
      const won = allSunk(board.ships)
      return {
        ...state,
        enemy: board,
        lastEvent: { by: 'player', coord: action.at, result },
        phase: won ? 'over' : 'playing',
        winner: won ? 'player' : undefined,
        turn: won ? 'player' : 'ai',
      }
    }

    case 'AI_FIRE': {
      if (state.phase !== 'playing' || state.turn !== 'ai') return state
      const ai = AIS[state.difficulty]
      const view = viewOf(state.player)
      const [coord, rng] = ai.chooseShot(view, state.aiMemory, state.rng)
      const { board, result } = fire(state.player, coord)
      if (result.kind === 'invalid') {
        throw new Error(`AI fired at an already-tried cell ${coord.x},${coord.y}`)
      }
      const aiMemory = ai.onResult(result, coord, viewOf(board), state.aiMemory)
      const lost = allSunk(board.ships)
      return {
        ...state,
        player: board,
        rng,
        aiMemory,
        lastEvent: { by: 'ai', coord, result },
        phase: lost ? 'over' : 'playing',
        winner: lost ? 'ai' : undefined,
        turn: 'player',
      }
    }
  }
}
