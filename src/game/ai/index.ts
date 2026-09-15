import type { Difficulty } from '../types'
import type { Ai } from './common'
import { easyAi } from './easy'

export type AiMemory = unknown

/**
 * Registry of AI strategies by difficulty. Normal (hunt & target with parity)
 * and Hard (probability density) are implemented in milestone 9; until then
 * they fall back to Easy so the game is playable at every setting.
 */
export const AIS: Record<Difficulty, Ai<AiMemory>> = {
  easy: easyAi,
  normal: easyAi,
  hard: easyAi,
}

export type { Ai, EnemyView } from './common'
export { viewOf } from './common'
