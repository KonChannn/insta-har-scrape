import type { Snapshot } from '@/lib/core/types';

const DB_NAME = 'igHarAnalyzer';
const DB_VERSION = 1;
const STORE = 'snapshots';
const LEGACY_KEY = 'igHarAnalyzer.snapshots.v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type Row = { key: string; snap: Snapshot };

const rowKey = (s: Snapshot) => `${s.account}|${s.captureTs}`;

function readLegacy(): Snapshot[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => s && s.account && s.captureTs) : [];
  } catch {
    return [];
  }
}

/** Load all snapshots; migrates the old localStorage format on first run. */
export async function loadSnapshots(): Promise<Snapshot[]> {
  if (typeof indexedDB === 'undefined') return readLegacy();
  try {
    const db = await openDb();
    const rows = await new Promise<Row[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Row[]);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (rows.length) return rows.map((r) => r.snap);

    const legacy = readLegacy();
    if (legacy.length) {
      await saveSnapshots(legacy);
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
    }
    return legacy;
  } catch {
    return readLegacy();
  }
}

/** Replace the whole snapshot set. Returns false when persistence is unavailable. */
export async function saveSnapshots(snaps: Snapshot[]): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return saveLegacy(snaps);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      for (const s of snaps) store.put({ key: rowKey(s), snap: s } satisfies Row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return saveLegacy(snaps);
  }
}

function saveLegacy(snaps: Snapshot[]): boolean {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(snaps));
    return true;
  } catch {
    return false;
  }
}

export function mergeSnapshots(existing: Snapshot[], incoming: Snapshot[]): Snapshot[] {
  const out = [...existing];
  for (const s of incoming) {
    if (!s || !s.account || !s.captureTs) continue;
    if (!out.some((x) => x.account === s.account && x.captureTs === s.captureTs)) out.push(s);
  }
  return out;
}

/** Remove the just-captured snapshot so re-uploading the same HAR stays idempotent. */
export function upsertSnapshot(snaps: Snapshot[], snap: Snapshot): Snapshot[] {
  return [
    ...snaps.filter((s) => !(s.account === snap.account && s.captureTs === snap.captureTs)),
    snap,
  ];
}
