import blackBourbonUrl from './assets/animations/Black Bourbon.mp4';
import redDragonUrl from './assets/animations/Red Dragon 2.mp4';
import royalBlueUrl from './assets/animations/Royal Blue.mp4';

// Celebration videos (shot on black, luma-keyed at render time) played on the
// TV when the Ace of Spades hits the table. Selection is a laptop-local
// preference like custom backs — it never needs to reach the server.
export interface AceAnimation {
  id: string;
  name: string;
  src: string;
}

export const ACE_ANIMATIONS: AceAnimation[] = [
  { id: 'black-bourbon', name: 'Black Bourbon', src: blackBourbonUrl },
  { id: 'red-dragon', name: 'Red Dragon', src: redDragonUrl },
  { id: 'royal-blue', name: 'Royal Blue', src: royalBlueUrl },
];

export function aceAnimationById(id: string): AceAnimation | null {
  return ACE_ANIMATIONS.find((a) => a.id === id) ?? null;
}

const STORAGE_KEY = 'royal-spades:ace-animation';

// null means the host turned the effect off.
export function loadAceAnimationId(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'none') return null;
    if (stored && aceAnimationById(stored)) return stored;
  } catch {
    // localStorage unavailable — fall through to the default.
  }
  return ACE_ANIMATIONS[0].id;
}

export function saveAceAnimationId(id: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, id ?? 'none');
  } catch {
    // Non-fatal: the selection just won't survive a reload.
  }
}
