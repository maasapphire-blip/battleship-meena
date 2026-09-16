import type { Difficulty } from '../types'
import type { Ai } from './common'
import { easyAi } from './easy'
import { hardAi } from './hard'
import { normalAi } from './normal'
import type { TargetMemory } from './target'

export type AiMemory = null | TargetMemory

/** Registry of AI strategies by difficulty. Difficulty is purely which strategy is selected. */
export const AIS: Record<Difficulty, Ai<AiMemory>> = {
  easy: easyAi,
  normal: normalAi,
  hard: hardAi,
}

export type { Ai, EnemyView } from './common'
export { viewOf } from './common'
