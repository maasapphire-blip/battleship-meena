import type { Ai } from './common'
import { pickCoord, randomFleet, untriedCells } from './common'

/** Easy: uniformly random shots, no memory. A hit does not influence the next shot. */
export const easyAi: Ai<null> = {
  initialMemory: null,
  placeFleet: randomFleet,
  chooseShot(view, _memory, rng) {
    return pickCoord(rng, untriedCells(view))
  },
  onResult() {
    return null
  },
}
