import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Result, Side } from '../lib/store';
import { backend } from './backend';

/**
 * Sessione di gioco:
 * - stesso telefono → me = null, path = null (stato in memoria)
 * - online          → me = il mio lato, path = nodo del database con lo stato della partita
 */
export interface Session {
  me: Side | null;
  path: string | null;
}
export const SessionCtx = createContext<Session>({ me: null, path: null });
export const useSession = () => useContext(SessionCtx);

/** Posso muovere adesso? Sullo stesso telefono sempre; online solo nel mio turno. */
export function useCanAct(turn: Side) {
  const { me } = useSession();
  return me === null || me === turn;
}

type Stored = { json: string };

/**
 * Stato della partita condiviso fra i due telefoni.
 * Gli aggiornamenti sono funzioni pure (stato precedente → nuovo stato): online girano come
 * transazione sul valore più recente del server, così due mosse contemporanee non si sovrascrivono.
 * Restituire lo stesso oggetto significa "mossa non valida, non cambiare niente".
 * Lo stato deve essere JSON puro (niente Set/Map/undefined).
 */
export function useShared<T>(init: () => T): [T | null, (fn: (prev: T) => T) => void] {
  const { path } = useSession();
  const [state, setState] = useState<T | null>(() => (path ? null : init()));
  const initRef = useRef(init);
  initRef.current = init;

  useEffect(() => {
    if (!path) return;
    const off = backend.subscribe(path, (v) => {
      const s = v as Stored | null;
      if (s?.json) setState(JSON.parse(s.json) as T);
    });
    // chi arriva per primo crea la partita
    backend
      .transaction<Stored>(path, (cur) => (cur?.json ? undefined : { json: JSON.stringify(initRef.current()) }))
      .catch(() => {});
    return off;
  }, [path]);

  const update = useCallback(
    (fn: (prev: T) => T) => {
      if (!path) {
        setState((p) => (p === null ? p : fn(p)));
        return;
      }
      backend
        .transaction<Stored>(path, (cur) => {
          if (!cur?.json) return undefined;
          const prev = JSON.parse(cur.json) as T;
          const next = fn(prev);
          return next === prev ? undefined : { json: JSON.stringify(next) };
        })
        .catch(() => {});
    },
    [path],
  );

  return [state, update];
}

/** Comunica alla schermata di gioco turno e risultato, ricavandoli dallo stato (vale anche per le mosse dell'altro telefono). */
export function useReport(
  turn: Side | undefined,
  result: Result | null | undefined,
  onTurn: (s: Side) => void,
  onEnd: (r: Result) => void,
) {
  useEffect(() => {
    if (turn !== undefined) onTurn(turn);
  }, [turn, onTurn]);
  useEffect(() => {
    if (result !== null && result !== undefined) onEnd(result);
  }, [result, onEnd]);
}
