import type { TableImageRef } from '@shared';

// ---------------------------------------------------------------------------
// Custom tables — host-imported photos that replace the velvet felt. Same
// pattern as custom card backs: laptop localStorage only, broadcast as a
// downscaled data URL when selected so phones match.
// ---------------------------------------------------------------------------

// A saved table remembers which builtin theme's tokens (gold, text, accents)
// were active when it was made, so selecting it keeps a coherent look.
export interface CustomTable extends TableImageRef {
  baseThemeId: string;
}

const STORAGE_KEY = 'royal-spades:custom-tables';

export function loadCustomTables(): CustomTable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CustomTable[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.id && t.src) : [];
  } catch {
    return [];
  }
}

function persist(tables: CustomTable[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

export function saveCustomTable(name: string, dataUrl: string, baseThemeId: string): CustomTable {
  const table: CustomTable = {
    id: `table-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Custom table',
    src: dataUrl,
    baseThemeId,
  };
  persist([...loadCustomTables(), table]);
  return table;
}

export function deleteCustomTable(id: string): CustomTable[] {
  const remaining = loadCustomTables().filter((t) => t.id !== id);
  persist(remaining);
  return remaining;
}
