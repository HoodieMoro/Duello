import { useCallback, useEffect, useState } from 'react';

/** 0 = giocatore 1 (rosa, in basso), 1 = giocatore 2 (azzurro, in alto). */
export type Side = 0 | 1;
export type Result = Side | 'draw';
export type Names = [string, string];
export type Score = [number, number];

export interface Store {
  names: Names;
  /** vittorie per gioco: id gioco → [vittorie G1, vittorie G2] */
  scores: Record<string, Score>;
}

const KEY = 'duello:v1';
const DEFAULT: Store = { names: ['', ''], scores: {} };

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const s = JSON.parse(raw) as Partial<Store>;
    const names =
      Array.isArray(s.names) && s.names.length === 2 && s.names.every((n) => typeof n === 'string')
        ? (s.names as Names)
        : DEFAULT.names;
    const scores = s.scores && typeof s.scores === 'object' ? s.scores : {};
    return { names, scores };
  } catch {
    return DEFAULT;
  }
}

export function useStore() {
  const [store, setStore] = useState<Store>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* navigazione privata: si gioca lo stesso, senza salvare */
    }
  }, [store]);

  const setName = useCallback((side: Side, name: string) => {
    setStore((s) => {
      const names = [...s.names] as Names;
      names[side] = name.slice(0, 16);
      return { ...s, names };
    });
  }, []);

  const addWin = useCallback((game: string, side: Side) => {
    setStore((s) => {
      const next = [...(s.scores[game] ?? [0, 0])] as Score;
      next[side] += 1;
      return { ...s, scores: { ...s.scores, [game]: next } };
    });
  }, []);

  const resetScores = useCallback(() => setStore((s) => ({ ...s, scores: {} })), []);

  return { store, setName, addWin, resetScores };
}

export const playerName = (names: Names, side: Side) => names[side].trim() || `Giocatore ${side + 1}`;

export const other = (side: Side): Side => (side === 0 ? 1 : 0);

export function totals(scores: Record<string, Score>): Score {
  return Object.values(scores).reduce<Score>((t, s) => [t[0] + s[0], t[1] + s[1]], [0, 0]);
}

/** Classi Tailwind per colore giocatore (scritte per intero perché Tailwind le trovi). */
export const PC = {
  text: ['text-p1', 'text-p2'],
  bg: ['bg-p1', 'bg-p2'],
  bgSoft: ['bg-p1-soft', 'bg-p2-soft'],
  border: ['border-p1', 'border-p2'],
  ring: ['ring-p1', 'ring-p2'],
  fill: ['fill-p1', 'fill-p2'],
  stroke: ['stroke-p1', 'stroke-p2'],
} as const;

export const HEX = ['#fb7185', '#38bdf8'] as const;

export function buzz(ms: number | number[] = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* non supportato */
  }
}
