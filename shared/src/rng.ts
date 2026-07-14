// Deterministic, seedable RNG so shuffles are testable. The engine never
// touches Math.random directly — callers inject one of these.

export type Rng = () => number; // uniform in [0, 1)

// mulberry32 — small, fast, good enough for card shuffling.
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  // Only used by the server to seed real games; tests pass fixed seeds.
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

// Fisher-Yates, returns a new array.
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
