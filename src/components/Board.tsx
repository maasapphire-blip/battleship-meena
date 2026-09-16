import { isSunk } from '../game/ships'
import { BOARD_SIZE } from '../game/types'
import type { Board as BoardModel, Coord, Orientation, Ship } from '../game/types'
import { ShipSprite } from './ShipSprite'

export const ROW_LABELS = 'ABCDEFGHIJ'

export function coordLabel(c: Coord): string {
  return `${ROW_LABELS[c.y]}${c.x + 1}`
}

export interface Ghost {
  origin: Coord
  orientation: Orientation
  length: number
  valid: boolean
}

interface Props {
  board: BoardModel
  title: string
  subtitle?: string
  /** Hide un-sunk ships (enemy waters). */
  hideShips?: boolean
  /** Game over: style surviving ships as newly revealed enemy vessels. */
  revealed?: boolean
  /** Colour-code hit marks on hidden ships by ship and name the ship in the cell label. */
  labelHits?: boolean
  /** Enable clicks on untried cells. */
  interactive?: boolean
  onCellClick?: (c: Coord) => void
  onCellHover?: (c: Coord | null) => void
  onShipClick?: (ship: Ship) => void
  aim?: Coord | null
  lastShot?: Coord | null
  ghost?: Ghost | null
  dimmed?: boolean
  testId?: string
}

export function Board({
  board,
  title,
  subtitle,
  hideShips = false,
  revealed = false,
  labelHits = false,
  interactive = false,
  onCellClick,
  onCellHover,
  onShipClick,
  aim,
  lastShot,
  ghost,
  dimmed,
  testId,
}: Props) {
  const rows = Array.from({ length: BOARD_SIZE }, (_, y) => y)
  const cols = Array.from({ length: BOARD_SIZE }, (_, x) => x)

  const visibleShips = hideShips ? board.ships.filter(isSunk) : board.ships
  const cellIsCoveredBySunk = (c: Coord) =>
    visibleShips.some((s) => isSunk(s) && coversCell(s, c))
  const shipAt = (c: Coord) => board.ships.find((s) => coversCell(s, c))

  return (
    <section className={`board${dimmed ? ' board--dimmed' : ''}`} data-testid={testId} aria-label={title}>
      <h2 className="board__title">
        <span>{title}</span>
        {subtitle && <b>{subtitle}</b>}
      </h2>
      <div className="grid" role="grid" aria-label={title} onMouseLeave={() => onCellHover?.(null)}>
        <div className="grid__label" />
        {cols.map((x) => (
          <div key={`c${x}`} className="grid__label">
            {x + 1}
          </div>
        ))}
        {rows.map((y) => (
          <RowFragment key={y} y={y}>
            {cols.map((x) => {
              const c = { x, y }
              const state = board.cells[y][x]
              const sunkHere = cellIsCoveredBySunk(c)
              const hitShip = labelHits && state === 'hit' && !sunkHere ? shipAt(c) : undefined
              const isAim = aim && aim.x === x && aim.y === y
              const isLast = lastShot && lastShot.x === x && lastShot.y === y
              const clickable = interactive && state === 'water'
              const cls = [
                'cell',
                `cell--${state}`,
                sunkHere ? 'cell--sunk' : '',
                isAim ? 'cell--aim' : '',
                isLast ? `cell--last cell--last-${state}` : '',
                clickable ? 'cell--clickable' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const label = `${coordLabel(c)}, ${sunkHere ? 'sunk' : state === 'water' ? 'not fired' : state}${hitShip ? ` — ${hitShip.name}` : ''}`
              return (
                <button
                  key={x}
                  type="button"
                  role="gridcell"
                  className={cls}
                  style={{ gridColumn: x + 2, gridRow: y + 2 }}
                  aria-label={label}
                  data-x={x}
                  data-y={y}
                  data-ship={hitShip?.name}
                  title={hitShip ? `Hit — ${hitShip.name} (${hitShip.hits.length} of ${hitShip.length})` : undefined}
                  disabled={!clickable}
                  onClick={() => clickable && onCellClick?.(c)}
                  onMouseEnter={() => onCellHover?.(c)}
                  onFocus={() => onCellHover?.(c)}
                >
                  {state === 'hit' && !sunkHere && hideShips && (
                    <span className={hitShip ? `cell__mark cell__mark--${hitShip.name}` : 'cell__mark'}>
                      ✕
                    </span>
                  )}
                </button>
              )
            })}
          </RowFragment>
        ))}

        {visibleShips.map((ship) => (
          <div
            key={ship.name}
            className={[
              'ship-wrap',
              onShipClick ? 'ship-wrap--clickable' : '',
              revealed && !isSunk(ship) ? 'ship-wrap--revealed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={shipGridArea(ship)}
            data-testid={`ship-${ship.name}`}
            data-sunk={isSunk(ship) ? 'true' : undefined}
            data-revealed={revealed && !isSunk(ship) ? 'true' : undefined}
            onClick={onShipClick ? () => onShipClick(ship) : undefined}
            title={onShipClick ? `Pick up ${ship.name}` : ship.name}
          >
            <ShipSprite
              length={ship.length}
              orientation={ship.orientation}
              hits={ship.hits}
              variant={isSunk(ship) ? 'sunk' : revealed ? 'revealed' : 'own'}
            />
          </div>
        ))}

        {ghost && (
          <div className="ship-wrap ship-wrap--ghost" style={shipGridArea(ghost)} data-testid="ghost">
            <ShipSprite
              length={visibleLength(ghost)}
              orientation={ghost.orientation}
              variant={ghost.valid ? 'ghost-ok' : 'ghost-bad'}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function RowFragment({ y, children }: { y: number; children: React.ReactNode }) {
  return (
    <>
      <div className="grid__label" style={{ gridColumn: 1, gridRow: y + 2 }}>
        {ROW_LABELS[y]}
      </div>
      {children}
    </>
  )
}

function coversCell(ship: Ship, c: Coord): boolean {
  const dx = ship.orientation === 'h' ? c.x - ship.origin.x : 0
  const dy = ship.orientation === 'v' ? c.y - ship.origin.y : 0
  const along = ship.orientation === 'h' ? dx : dy
  const across = ship.orientation === 'h' ? c.y - ship.origin.y : c.x - ship.origin.x
  return across === 0 && along >= 0 && along < ship.length
}

type Placement = { origin: Coord; orientation: Orientation; length: number }

function visibleLength(s: Placement): number {
  const room = s.orientation === 'h' ? BOARD_SIZE - s.origin.x : BOARD_SIZE - s.origin.y
  return Math.max(1, Math.min(s.length, room))
}

function shipGridArea(s: Placement): React.CSSProperties {
  const colStart = s.origin.x + 2
  const rowStart = s.origin.y + 2
  const colSpan = s.orientation === 'h' ? visibleLength(s) : 1
  const rowSpan = s.orientation === 'v' ? visibleLength(s) : 1
  return {
    gridColumn: `${colStart} / span ${colSpan}`,
    gridRow: `${rowStart} / span ${rowSpan}`,
  }
}
