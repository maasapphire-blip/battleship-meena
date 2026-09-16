import type { Ai } from './common'
import { pickCoord, randomFleet, untriedCells } from './common'
import type { TargetMemory } from './target'
import { emptyTargetMemory, targetCandidates, trackResult } from './target'

/**
 * Normal: hunt & target.
 * - Hunt: fire only at checkerboard-parity cells (every ship is >= 2 long, so
 *   each one covers at least one), falling back to any untried cell.
 * - Target: after a hit, try its neighbours; after two aligned hits, extend
 *   along that axis until the ship sinks. Leftover open hits (adjacent ships)
 *   keep the AI in target mode.
 */
export const normalAi: Ai<TargetMemory> = {
  initialMemory: emptyTargetMemory,
  placeFleet: randomFleet,
  chooseShot(view, memory, rng) {
    const targets = targetCandidates(view, memory)
    if (targets.length > 0) return pickCoord(rng, targets)
    const untried = untriedCells(view)
    const parity = untried.filter((c) => (c.x + c.y) % 2 === 0)
    return pickCoord(rng, parity.length > 0 ? parity : untried)
  },
  onResult: trackResult,
}
