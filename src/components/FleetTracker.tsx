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
  /** Battle mode (enemy fleet): show per-ship hit progress and colour swatch matching the board marks. */
  showDamage?: boolean
}

export function FleetTracker({ ships, currentIndex, onSelect, label, showDamage = false }: Props) {
  const byName = new Map<ShipName, Ship>(ships.map((s) => [s.name, s]))
  return (
    <ul className="fleet" aria-label={label ?? 'Fleet'}>
      {FLEET.map((spec, i) => {
        const ship = byName.get(spec.name)
        const sunk = ship ? isSunk(ship) : false
        const placed = ship !== undefined
        const current = currentIndex === i
        const hits = ship?.hits.length ?? 0
        const damaged = showDamage && !sunk && hits > 0
        const cls = [
          'fleet__item',
          showDamage ? `fleet__item--${spec.name}` : '',
          sunk ? 'fleet__item--sunk' : '',
          damaged ? 'fleet__item--damaged' : '',
          onSelect && placed ? 'fleet__item--placed' : '',
          current ? 'fleet__item--current' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const content = (
          <>
            <span className="fleet__mini">
              <ShipSprite
                length={spec.length}
                variant={sunk ? 'sunk' : 'mini'}
                hits={damaged ? Array.from({ length: hits }, (_, k) => k) : undefined}
              />
            </span>
            <span className="fleet__name">{spec.name}</span>
            <span className="fleet__len">({spec.length})</span>
            {sunk && <span className="fleet__tag fleet__tag--sunk">sunk</span>}
            {damaged && (
              <span className="fleet__tag fleet__tag--hit" data-testid={`damage-${spec.name}`}>
                hit {hits}/{spec.length}
              </span>
            )}
            {onSelect && placed && !sunk && <span className="fleet__tag fleet__tag--ok">✓</span>}
          </>
        )
        return (
          <li
            key={spec.name}
            className={cls}
            data-testid={`fleet-${spec.name}`}
            data-sunk={sunk || undefined}
            data-hits={showDamage ? hits : undefined}
          >
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
