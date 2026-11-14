import type { Result, Score, Side } from '../lib/store';
import { backend, isLocalTest } from './backend';

/*
 * Struttura nel database:
 *   rooms/{CODICE}/meta            { createdAt, round, game?, players: { p0: Player, p1?: Player } }
 *   rooms/{CODICE}/rounds/r{n}     { json }   stato della partita n
 *   rooms/{CODICE}/results/r{n}    { game, winner }
 * (chiavi "p0"/"r3" invece di numeri: Firebase trasformerebbe le chiavi numeriche in array)
 */

export interface Player {
  id: string;
  name: string;
  online?: boolean;
}
export interface RoomMeta {
  createdAt: number;
  round: number;
  game?: string | null;
  players: { p0?: Player; p1?: Player };
}
export type RoomResults = Record<string, { game: string; winner: Result }>;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O e 1/I
export const CODE_LENGTH = 4;

export const roomPath = (code: string) => `rooms/${code}`;
export const slot = (side: Side) => (side === 0 ? 'p0' : 'p1');

export function normalizeCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export function clientId(): string {
  const KEY = 'duello:client-id';
  // in sviluppo ogni scheda è un "telefono" diverso (per provare l'online in due schede)
  const store = isLocalTest || import.meta.env.DEV ? sessionStorage : localStorage;
  try {
    let id = store.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.setItem(KEY, id);
    }
    return id;
  } catch {
    // senza storage: id valido finché la pagina resta aperta
    const w = window as unknown as { __duelloId?: string };
    w.__duelloId ??= Math.random().toString(36).slice(2);
    return w.__duelloId;
  }
}

export async function createRoom(name: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: CODE_LENGTH }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(
      '',
    );
    const res = await backend.transaction<RoomMeta>(`${roomPath(code)}/meta`, (cur) =>
      cur ? undefined : { createdAt: Date.now(), round: 0, players: { p0: { id: clientId(), name } } },
    );
    if (res.committed) return code;
  }
  throw new Error('Impossibile creare la stanza, riprova.');
}

/** Entra come giocatore 2, oppure rientra nel proprio posto. Restituisce il lato o un errore. */
export async function joinRoom(code: string, name: string): Promise<Side | 'full' | 'missing'> {
  const id = clientId();
  let outcome: Side | 'full' | 'missing' = 'missing';
  await backend.transaction<RoomMeta>(`${roomPath(code)}/meta`, (cur) => {
    if (!cur) {
      outcome = 'missing';
      return undefined;
    }
    if (cur.players.p0?.id === id) {
      outcome = 0;
      return undefined;
    }
    if (cur.players.p1?.id === id) {
      outcome = 1;
      return undefined;
    }
    if (cur.players.p1) {
      outcome = 'full';
      return undefined;
    }
    outcome = 1;
    return { ...cur, players: { ...cur.players, p1: { id, name } } };
  });
  return outcome;
}

export function startGame(code: string, game: string) {
  return backend.transaction<RoomMeta>(`${roomPath(code)}/meta`, (cur) =>
    cur ? { ...cur, game, round: (cur.round ?? 0) + 1 } : undefined,
  );
}

/** Rivincita: solo se nessuno l'ha già chiesta (se premete insieme parte una sola nuova partita). */
export function rematch(code: string, fromRound: number) {
  return backend.transaction<RoomMeta>(`${roomPath(code)}/meta`, (cur) =>
    cur && cur.round === fromRound ? { ...cur, round: fromRound + 1 } : undefined,
  );
}

export function backToRoomMenu(code: string) {
  return backend.update(`${roomPath(code)}/meta`, { game: null });
}

export function saveResult(code: string, round: number, game: string, winner: Result) {
  return backend.update(`${roomPath(code)}/results`, { [`r${round}`]: { game, winner } });
}

export function scoresFrom(results: RoomResults | null): Record<string, Score> {
  const out: Record<string, Score> = {};
  for (const r of Object.values(results ?? {})) {
    if (r.winner === 'draw') continue;
    const s = (out[r.game] ??= [0, 0]);
    s[r.winner as Side] += 1;
  }
  return out;
}
