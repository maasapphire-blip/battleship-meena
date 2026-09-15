/**
 * Small deterministic PRNG (mulberry32). State is a plain number so it can live
 * in immutable game state and be advanced functionally.
 */
export type Rng = { seed: number }

export function createRng(seed: number): Rng {
  return { seed: seed >>> 0 }
}

/** Returns a float in [0, 1) and the advanced RNG. */
export function nextFloat(rng: Rng): [number, Rng] {
  let t = (rng.seed + 0x6d2b79f5) >>> 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, { seed: next }]
}

/** Returns an integer in [0, max) and the advanced RNG. */
export function nextInt(rng: Rng, max: number): [number, Rng] {
  const [f, next] = nextFloat(rng)
  return [Math.floor(f * max), next]
}

export function pick<T>(rng: Rng, items: readonly T[]): [T, Rng] {
  if (items.length === 0) throw new Error('pick from empty list')
  const [i, next] = nextInt(rng, items.length)
  return [items[i], next]
}

export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
