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

// null means the host turned the effect off. Custom ids can't be verified
// until IndexedDB loads, so any stored id is trusted here; the overlay resets
// the selection to the default if the id turns out to be gone.
export function loadAceAnimationId(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'none') return null;
    if (stored) return stored;
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

// ---------------------------------------------------------------------------
// Custom animations — host-uploaded black-background videos. The blobs are
// far too large for localStorage, so they live in the laptop's IndexedDB and
// play via object URLs. No pre-processing is needed: the luma-key shader in
// LumaVideo keys black to transparent at render time for any source, so an
// upload is keyed exactly like the built-ins. TV-only, nothing is broadcast.
// ---------------------------------------------------------------------------

const DB_NAME = 'royal-spades';
const DB_STORE = 'ace-animations';

interface StoredAnimation {
  id: string;
  name: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// One object URL per stored blob, reused across loads so playback and the
// host-panel list always agree on the src.
const objectUrls = new Map<string, string>();

function toAnimation(record: StoredAnimation): AceAnimation {
  let url = objectUrls.get(record.id);
  if (!url) {
    url = URL.createObjectURL(record.blob);
    objectUrls.set(record.id, url);
  }
  return { id: record.id, name: record.name, src: url };
}

export async function loadCustomAnimations(): Promise<AceAnimation[]> {
  try {
    const records = await withStore('readonly', (s) => s.getAll() as IDBRequest<StoredAnimation[]>);
    return records.filter((r) => r && r.id && r.blob).map(toAnimation);
  } catch {
    return [];
  }
}

export async function addCustomAnimation(file: File): Promise<AceAnimation> {
  const record: StoredAnimation = {
    id: `anim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name.replace(/\.[^.]+$/, '').trim() || 'Custom animation',
    blob: file,
  };
  await withStore('readwrite', (s) => s.put(record));
  return toAnimation(record);
}

export async function deleteCustomAnimation(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id));
  const url = objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
  }
}
