import type { Orientation } from '../game/types'

export type SpriteVariant = 'own' | 'sunk' | 'revealed' | 'ghost-ok' | 'ghost-bad' | 'mini'

interface Props {
  length: number
  orientation?: Orientation
  hits?: readonly number[]
  variant?: SpriteVariant
  className?: string
}

/**
 * Vessel silhouette spanning `length` cells. Drawn in a horizontal
 * coordinate space (100 units per cell) and rotated for vertical ships.
 */
export function ShipSprite({ length, orientation = 'h', hits = [], variant = 'own', className }: Props) {
  const W = length * 100
  const viewBox = orientation === 'h' ? `0 0 ${W} 100` : `0 0 100 ${W}`
  const bridge = Math.floor((length - 1) / 2)
  return (
    <svg
      className={['ship-sprite', `ship-${variant}`, className].filter(Boolean).join(' ')}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={orientation === 'h' ? undefined : 'translate(100 0) rotate(90)'}>
        <path
          className="hull"
          d={`M6 50 Q6 8 44 8 L${W - 46} 8 L${W - 4} 50 L${W - 46} 92 L44 92 Q6 92 6 50 Z`}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <rect className="deck" x={34} y={30} width={W - 92} height={40} rx={10} />
        {Array.from({ length }, (_, i) => {
          const cx = i * 100 + 50
          if (i === bridge) {
            return <rect key={i} className="detail" x={cx - 20} y={20} width={40} height={60} rx={6} strokeWidth={3} />
          }
          if ((i !== 0 && i !== length - 1) || length === 2) {
            return <circle key={i} className="detail" cx={cx} cy={50} r={15} strokeWidth={3} />
          }
          return null
        })}
        {hits.map((i) => {
          const cx = i * 100 + 50
          return (
            <g key={`hit-${i}`} className="damage">
              <circle cx={cx} cy={50} r={30} className="scorch" />
              {variant !== 'sunk' && (
                <g className="fire">
                  <path
                    d={`M${cx} 22 C${cx + 22} 40 ${cx + 20} 60 ${cx} 78 C${cx - 20} 60 ${cx - 22} 40 ${cx} 22Z`}
                    fill="#ff7a2a"
                  />
                  <path
                    d={`M${cx} 38 C${cx + 11} 48 ${cx + 10} 62 ${cx} 70 C${cx - 10} 62 ${cx - 11} 48 ${cx} 38Z`}
                    fill="#ffd54a"
                  />
                </g>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
