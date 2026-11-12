import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
  update,
  type Database,
} from 'firebase/database';
import { firebaseConfig } from './config';

/**
 * Il minimo indispensabile per sincronizzare due telefoni.
 * In produzione è Firebase Realtime Database; in sviluppo (`?backend=locale`)
 * un finto database nel localStorage che collega due schede dello stesso browser.
 */
export interface Backend {
  subscribe(path: string, cb: (value: unknown) => void): () => void;
  /** fn riceve il valore attuale e restituisce il nuovo, oppure undefined per annullare */
  transaction<T>(path: string, fn: (cur: T | null) => T | undefined): Promise<{ committed: boolean; value: T | null }>;
  update(path: string, values: Record<string, unknown>): Promise<void>;
  /** segna online=true finché la pagina è aperta e connessa, false quando si disconnette */
  presence(path: string): () => void;
}

// ───────────────────────── Firebase ─────────────────────────

let db: Database | null = null;
function fdb() {
  if (!db) db = getDatabase(initializeApp(firebaseConfig));
  return db;
}

const firebaseBackend: Backend = {
  subscribe(path, cb) {
    return onValue(ref(fdb(), path), (snap) => cb(snap.val()));
  },
  async transaction(path, fn) {
    const res = await runTransaction(ref(fdb(), path), (cur) => fn(cur));
    return { committed: res.committed, value: res.snapshot.val() };
  },
  update(path, values) {
    return update(ref(fdb(), path), values);
  },
  presence(path) {
    const r = ref(fdb(), path);
    const off = onValue(ref(fdb(), '.info/connected'), (snap) => {
      if (snap.val() !== true) return;
      onDisconnect(r)
        .update({ online: false, seen: serverTimestamp() })
        .then(() => update(r, { online: true, seen: serverTimestamp() }))
        .catch(() => {});
    });
    return () => {
      off();
      update(r, { online: false }).catch(() => {});
    };
  },
};

// ─────────────────── Finto database locale (solo test) ───────────────────

const FAKE_KEY = 'duello:fake-db';
const listeners = new Set<() => void>();

function readAll(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(FAKE_KEY) || '{}');
  } catch {
    return {};
  }
}
function getAt(root: unknown, path: string): unknown {
  return (
    path
      .split('/')
      .filter(Boolean)
      .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), root) ??
    null
  );
}
function setAt(root: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('/').filter(Boolean);
  let o = root;
  keys.slice(0, -1).forEach((k) => {
    if (!o[k] || typeof o[k] !== 'object') o[k] = {};
    o = o[k] as Record<string, unknown>;
  });
  const last = keys[keys.length - 1];
  if (value === null || value === undefined) delete o[last];
  else o[last] = value;
}
function write(root: Record<string, unknown>) {
  localStorage.setItem(FAKE_KEY, JSON.stringify(root));
  listeners.forEach((l) => l());
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FAKE_KEY) listeners.forEach((l) => l());
  });
}

const localBackend: Backend = {
  subscribe(path, cb) {
    let last = '';
    const check = () => {
      const v = getAt(readAll(), path);
      const s = JSON.stringify(v);
      if (s !== last) {
        last = s;
        cb(v === null ? null : JSON.parse(s));
      }
    };
    listeners.add(check);
    setTimeout(check, 30); // asincrono come Firebase
    return () => listeners.delete(check);
  },
  async transaction<T>(path: string, fn: (cur: T | null) => T | undefined) {
    await new Promise((r) => setTimeout(r, 40)); // simula un po' di rete
    const root = readAll();
    const cur = getAt(root, path) as T | null;
    const next = fn(cur === null ? null : (JSON.parse(JSON.stringify(cur)) as T));
    if (next === undefined) return { committed: false, value: cur };
    setAt(root, path, next);
    write(root);
    return { committed: true, value: next };
  },
  async update(path, values) {
    const root = readAll();
    for (const [k, v] of Object.entries(values)) setAt(root, `${path}/${k}`, v);
    write(root);
  },
  presence(path) {
    const mark = (online: boolean) => {
      const root = readAll();
      setAt(root, `${path}/online`, online);
      write(root);
    };
    mark(true);
    const bye = () => mark(false);
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      bye();
    };
  },
};

// ─────────────────────────────────────────────────────────

const wantsLocal =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('backend') === 'locale';

export const backend: Backend = wantsLocal ? localBackend : firebaseBackend;
export const isLocalTest = wantsLocal;

/** true se l'online è utilizzabile (Firebase configurato, o finto database in sviluppo) */
export const onlineAvailable = wantsLocal || Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey);
