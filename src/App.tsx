import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Board, coordLabel } from './components/Board'
import type { Ghost } from './components/Board'
import { FleetTracker } from './components/FleetTracker'
import { Icon } from './components/Icon'
import { StatusBar } from './components/StatusBar'
import { canPlace, hitsOn, shotsFired } from './game/board'
import { allShipsPlaced, createGame, currentShipSpec, gameReducer } from './game/reducer'
import type { GameState, ShotEvent } from './game/reducer'
import { isSunk, makeShip } from './game/ships'
import { FLEET } from './game/types'
import type { Coord, Difficulty, Ship } from './game/types'
import { useMediaQuery } from './hooks/useMediaQuery'

const AI_DELAY_MS = 650
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
]

function initialGame(): GameState {
  return createGame(Date.now() >>> 0, 'normal')
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGame)
  const [hover, setHover] = useState<Coord | null>(null)
  const [aim, setAim] = useState<Coord | null>(null)
  const [scoreboardOpen, setScoreboardOpen] = useState(true)
  const coarsePointer = useMediaQuery('(pointer: coarse)')

  // AI replies after a short delay so the player can see their own shot land.
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'ai') return
    const t = setTimeout(() => dispatch({ type: 'AI_FIRE' }), AI_DELAY_MS)
    return () => clearTimeout(t)
  }, [state.phase, state.turn])

  // Keyboard: R rotates during placement.
  useEffect(() => {
    if (state.phase !== 'placing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'ROTATE' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase])

  useEffect(() => {
    if (state.phase !== 'playing') setAim(null)
    if (state.phase === 'over') setScoreboardOpen(true)
  }, [state.phase])

  const ghost: Ghost | null = useMemo(() => {
    if (state.phase !== 'placing' || !hover || allShipsPlaced(state)) return null
    const spec = currentShipSpec(state)
    if (state.player.ships.some((s) => s.name === spec.name)) return null
    const ship = makeShip(spec, hover, state.placing.orientation)
    return { origin: hover, orientation: ship.orientation, length: ship.length, valid: canPlace(state.player, ship) }
  }, [state, hover])

  const fireAt = useCallback(
    (c: Coord) => {
      setAim(null)
      dispatch({ type: 'FIRE', at: c })
    },
    [],
  )

  const onEnemyCell = (c: Coord) => {
    if (state.turn !== 'player') return
    if (coarsePointer) {
      if (aim && aim.x === c.x && aim.y === c.y) fireAt(c)
      else setAim(c)
      return
    }
    fireAt(c)
  }

  const status = describe(state)
  const playerShots = shotsFired(state.enemy)
  const playerHits = hitsOn(state.enemy)
  const accuracy = playerShots ? Math.round((playerHits / playerShots) * 100) : 0
  const playerAfloat = state.player.ships.filter((s) => !isSunk(s)).length
  const enemySunk = state.enemy.ships.filter(isSunk).length
  const enemyAfloat = FLEET.length - enemySunk
  const gameOver = state.phase === 'over'
  const won = state.winner === 'player'
  const resultTitle = won ? 'Victory!' : 'Defeat'
  const resultSub = won
    ? `You sank the enemy fleet in ${playerShots} shots.`
    : `The enemy sank your fleet. You sank ${enemySunk} of ${FLEET.length} ships — the ${enemyAfloat} that escaped are revealed on the board.`
  const stats = (
    <div className="stats">
      <div className="stat">
        <b>{playerShots}</b>
        <span>Shots</span>
      </div>
      <div className="stat">
        <b>{accuracy}%</b>
        <span>Accuracy</span>
      </div>
      <div className="stat">
        <b>{enemySunk}</b>
        <span>Ships sunk</span>
      </div>
      <div className="stat">
        <b>{FLEET.length - playerAfloat}</b>
        <span>Ships lost</span>
      </div>
    </div>
  )

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <Icon name="anchor" /> Battleship
        </h1>
        {state.phase !== 'placing' && (
          <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'RESET' })}>
            New game
          </button>
        )}
      </header>

      <StatusBar message={status.message} detail={status.detail} tone={status.tone} />

      {state.phase === 'placing' && (
        <>
          <div className="boards boards--single">
            <Board
              title="Your fleet"
              subtitle={`${state.player.ships.length} / ${FLEET.length} placed`}
              board={state.player}
              interactive={!allShipsPlaced(state)}
              onCellClick={(c) => dispatch({ type: 'PLACE_SHIP', at: c })}
              onCellHover={setHover}
              onShipClick={(ship) => dispatch({ type: 'PICK_UP_SHIP', name: ship.name })}
              ghost={ghost}
              testId="player-board"
            />
          </div>
          <div className="dock">
            <div>
              <FleetTracker
                ships={state.player.ships}
                currentIndex={allShipsPlaced(state) ? undefined : state.placing.shipIndex}
                onSelect={(i) => dispatch({ type: 'SELECT_SHIP', index: i })}
                label="Your ships"
              />
              <p className="hint">
                {coarsePointer ? 'Tap' : 'Click'} a cell to place the highlighted ship. {coarsePointer ? 'Tap' : 'Click'} a placed ship
                to pick it up again.
              </p>
            </div>
            <div className="actions">
              <label className="select">
                Difficulty
                <select
                  value={state.difficulty}
                  onChange={(e) => dispatch({ type: 'SET_DIFFICULTY', difficulty: e.target.value as Difficulty })}
                  data-testid="difficulty"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn" onClick={() => dispatch({ type: 'ROTATE' })}>
                <Icon name="rotate" /> Rotate {coarsePointer ? '' : '(R)'} · {state.placing.orientation === 'h' ? 'Horizontal' : 'Vertical'}
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: 'RANDOMIZE' })}>
                <Icon name="dice" /> Randomize
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => dispatch({ type: 'CLEAR' })}
                disabled={state.player.ships.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => dispatch({ type: 'START' })}
                disabled={!allShipsPlaced(state)}
                data-testid="start"
              >
                Start battle
              </button>
            </div>
          </div>
        </>
      )}

      {(state.phase === 'playing' || gameOver) && (
        <>
          {gameOver && !scoreboardOpen && (
            <section className="result" role="status" aria-labelledby="gameover-title" data-testid="gameover">
              <div className={`result__icon ${won ? 'result__icon--win' : 'result__icon--lose'}`}>
                <Icon name={won ? 'trophy' : 'burst'} />
              </div>
              <div className="result__body">
                <h2 id="gameover-title" data-testid="gameover-title">
                  {resultTitle}
                </h2>
                <p className="result__sub">{resultSub}</p>
              </div>
              <div className="result__actions">
                <button type="button" className="btn" onClick={() => setScoreboardOpen(true)} data-testid="show-scoreboard">
                  Scoreboard
                </button>
                <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'RESET' })} data-testid="play-again">
                  ▶ Play again
                </button>
              </div>
            </section>
          )}

          <div className="boards">
            <div className="board-col">
              <Board
                title="Enemy waters"
                subtitle={
                  gameOver
                    ? enemyAfloat === 0
                      ? 'Fleet revealed — all sunk'
                      : `Fleet revealed — ${enemyAfloat} escaped`
                    : state.turn === 'player'
                      ? coarsePointer
                        ? 'Tap to aim'
                        : 'Click to fire'
                      : 'Enemy firing…'
                }
                board={state.enemy}
                hideShips={!gameOver}
                revealed={gameOver}
                interactive={state.phase === 'playing' && state.turn === 'player'}
                onCellClick={onEnemyCell}
                aim={aim}
                lastShot={state.lastEvent?.by === 'player' ? state.lastEvent.coord : null}
                dimmed={state.phase === 'playing' && state.turn === 'ai'}
                labelHits
                testId="enemy-board"
              />
              <FleetTracker ships={state.enemy.ships} label="Enemy ships" showDamage />
              {coarsePointer && state.phase === 'playing' && (
                <button
                  type="button"
                  className="btn btn--fire"
                  disabled={!aim || state.turn !== 'player'}
                  onClick={() => aim && fireAt(aim)}
                  data-testid="fire"
                >
                  <Icon name="fire" /> {aim ? `FIRE at ${coordLabel(aim)}` : 'Tap a cell to aim'}
                </button>
              )}
            </div>
            <div className="board-col">
              <Board
                title="Your fleet"
                subtitle={`${playerAfloat} / ${FLEET.length} afloat`}
                board={state.player}
                lastShot={state.lastEvent?.by === 'ai' ? state.lastEvent.coord : null}
                testId="player-board"
              />
              <p className="hint">
                Shots {playerShots} · Hits {playerHits} · Accuracy {accuracy}%
              </p>
            </div>
          </div>

          {gameOver && scoreboardOpen && (
            <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="gameover-title" data-testid="gameover">
              <div className="modal">
                <div className={`modal__icon ${won ? 'modal__icon--win' : 'modal__icon--lose'}`}>
                  <Icon name={won ? 'trophy' : 'burst'} />
                </div>
                <h2 id="gameover-title" data-testid="gameover-title">
                  {resultTitle}
                </h2>
                <p className="modal__sub">{resultSub}</p>
                {stats}
                <div className="modal__actions">
                  <button type="button" className="btn" onClick={() => setScoreboardOpen(false)} data-testid="view-boards">
                    View boards
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'RESET' })} data-testid="play-again">
                    ▶ Play again
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function describeShot(e: ShotEvent, enemyShips: readonly Ship[]): string {
  const who = e.by === 'player' ? 'You' : 'Enemy'
  const at = coordLabel(e.coord)
  switch (e.result.kind) {
    case 'miss':
      return `${who} fired at ${at} — miss.`
    case 'hit': {
      const name = e.result.ship
      if (e.by === 'ai') return `Enemy hit your ${name} at ${at}!`
      const ship = enemyShips.find((s) => s.name === name)
      const progress = ship ? ` (${ship.hits.length} of ${ship.length})` : ''
      return `You hit the enemy ${name} at ${at}!${progress}`
    }
    case 'sunk':
      return e.by === 'player' ? `You sank the enemy ${e.result.ship} at ${at}!` : `Enemy sank your ${e.result.ship} at ${at}!`
  }
}

function describe(state: GameState): { message: string; detail?: string; tone: 'info' | 'good' | 'bad' } {
  if (state.phase === 'placing') {
    if (allShipsPlaced(state)) {
      return { message: 'All ships placed — ready for battle.', detail: 'Click a ship to move it, or start the battle.', tone: 'good' }
    }
    const spec = currentShipSpec(state)
    return {
      message: `Place your ${spec.name} (${spec.length})`,
      detail: `${state.player.ships.length} of ${FLEET.length} ships placed · ${state.placing.orientation === 'h' ? 'horizontal' : 'vertical'}`,
      tone: 'info',
    }
  }
  if (state.phase === 'over') {
    return {
      message: state.winner === 'player' ? 'Victory — you sank the enemy fleet!' : 'Defeat — your fleet was sunk.',
      detail: state.lastEvent ? describeShot(state.lastEvent, state.enemy.ships) : undefined,
      tone: state.winner === 'player' ? 'good' : 'bad',
    }
  }
  const last = state.lastEvent
  if (!last) return { message: 'Your turn — fire at enemy waters.', tone: 'info' }
  const tone: 'info' | 'good' | 'bad' =
    last.result.kind === 'miss' ? 'info' : last.by === 'player' ? 'good' : 'bad'
  return {
    message: state.turn === 'player' ? 'Your turn' : 'Enemy is firing…',
    detail: describeShot(last, state.enemy.ships),
    tone,
  }
}
