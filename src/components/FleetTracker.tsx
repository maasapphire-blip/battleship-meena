import { isSunk } from '../game/ships'
import { FLEET } from '../game/types'
import type { Ship, ShipName } from '../game/types'
import { ShipSprite } from './ShipSprite'

interface Props {
  ships: readonly Ship[]
  /** Placement mode: highlight the current ship and allow selecting. */
  currentIndex?: number
  onSelect?: (index: number) => void
  label?: string
}

export function FleetTracker({ ships, currentIndex, onSelect, label }: Props) {
  const byName = new Map<ShipName, Ship>(ships.map((s) => [s.name, s]))
  return (
    <ul className="fleet" aria-label={label ?? 'Fleet'}>
      {FLEET.map((spec, i) => {
        const ship = byName.get(spec.name)
        const sunk = ship ? isSunk(ship) : false
        const placed = ship !== undefined
        const current = currentIndex === i
        const cls = [
          'fleet__item',
          sunk ? 'fleet__item--sunk' : '',
          onSelect && placed ? 'fleet__item--placed' : '',
          current ? 'fleet__item--current' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const content = (
          <>
            <span className="fleet__mini">
              <ShipSprite length={spec.length} variant={sunk ? 'sunk' : 'mini'} />
            </span>
            <span className="fleet__name">{spec.name}</span>
            <span className="fleet__len">({spec.length})</span>
            {sunk && <span className="fleet__tag fleet__tag--sunk">sunk</span>}
            {onSelect && placed && !sunk && <span className="fleet__tag fleet__tag--ok">✓</span>}
          </>
        )
        return (
          <li key={spec.name} className={cls} data-testid={`fleet-${spec.name}`} data-sunk={sunk || undefined}>
            {onSelect ? (
              <button
                type="button"
                className="fleet__btn"
                aria-pressed={current}
                onClick={() => onSelect(i)}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}
