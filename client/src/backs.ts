import type { CardBack, CardBackRef } from '@shared';
import backCrimson from './assets/cards/backs/back-crimson.svg';
import backEmerald from './assets/cards/backs/back-emerald.svg';
import backSapphire from './assets/cards/backs/back-sapphire.svg';

export const BUILTIN_BACKS: CardBack[] = [
  { id: 'back-sapphire', name: 'Sapphire Crown', kind: 'builtin', src: backSapphire },
  { id: 'back-emerald', name: 'Emerald Crown', kind: 'builtin', src: backEmerald },
  { id: 'back-crimson', name: 'Crimson Crown', kind: 'builtin', src: backCrimson },
];

// Resolve whatever the server broadcast into a renderable image source.
// Builtin backs are bundled on every device; custom backs carry a data URL.
export function resolveBackSrc(back: CardBackRef | null | undefined): string {
  if (!back) return BUILTIN_BACKS[0].src;
  if (back.kind === 'custom' && back.src) return back.src;
  return BUILTIN_BACKS.find((b) => b.id === back.id)?.src ?? BUILTIN_BACKS[0].src;
}

// ---------------------------------------------------------------------------
// Custom backs — laptop localStorage only (05-themes-and-skins.md)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'royal-spades:custom-backs';

export function loadCustomBacks(): CardBack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CardBack[]) : [];
    return Array.isArray(parsed) ? parsed.filter((b) => b && b.id && b.src) : [];
  } catch {
    return [];
  }
}

function persist(backs: CardBack[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(backs));
}

export function saveCustomBack(name: string, dataUrl: string): CardBack {
  const back: CardBack = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Custom back',
    kind: 'custom',
    src: dataUrl,
  };
  persist([...loadCustomBacks(), back]);
  return back;
}

export function deleteCustomBack(id: string): CardBack[] {
  const remaining = loadCustomBacks().filter((b) => b.id !== id);
  persist(remaining);
  return remaining;
}

// Export/import so backs are portable between laptops.
export function exportCustomBacks(): string {
  return JSON.stringify({ app: 'royal-spades', kind: 'card-backs', version: 1, backs: loadCustomBacks() }, null, 2);
}

export function importCustomBacks(json: string): CardBack[] {
  const parsed = JSON.parse(json) as { backs?: CardBack[] };
  const incoming = (parsed.backs ?? []).filter(
    (b) => b && b.kind === 'custom' && typeof b.src === 'string' && b.src.startsWith('data:image/'),
  );
  if (incoming.length === 0) throw new Error('No card backs found in that file.');
  const existing = loadCustomBacks();
  const known = new Set(existing.map((b) => b.id));
  const merged = [...existing, ...incoming.filter((b) => !known.has(b.id))];
  persist(merged);
  return merged;
}
