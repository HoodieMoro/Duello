import { useState } from 'react';
import { Crown } from 'lucide-react';
import Loading from '../components/Loading';
import { buzz, other, PC, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useSession, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

/*
 * Dama all'italiana (regole essenziali):
 * - si gioca sulle caselle scure; le pedine avanzano di una casella in diagonale
 * - presa obbligatoria, anche multipla, con la stessa pedina
 * - la pedina mangia solo in avanti e non può mangiare la dama
 * - la dama si muove e mangia di una casella in tutte le diagonali
 * - chi non può più muovere perde
 */

type Piece = { side: Side; king: boolean } | null;
type Board = Piece[]; // indice = r * 8 + c, r = 0 in alto (lato del giocatore 2)
type Move = { from: number; to: number; cap?: number };

const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const isDark = (i: number) => ((i >> 3) + (i & 7)) % 2 === 1;

function initial(): Board {
  const b: Board = Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if (!isDark(i)) continue;
    const r = i >> 3;
    if (r <= 2) b[i] = { side: 1, king: false };
    if (r >= 5) b[i] = { side: 0, king: false };
  }
  return b;
}

function dirs(p: NonNullable<Piece>): [number, number][] {
  if (p.king)
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  return p.side === 0
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function pieceMoves(b: Board, i: number) {
  const p = b[i]!;
  const r = i >> 3;
  const c = i & 7;
  const caps: Move[] = [];
  const steps: Move[] = [];
  for (const [dr, dc] of dirs(p)) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inside(r1, c1)) continue;
    const t = b[r1 * 8 + c1];
    if (!t) {
      steps.push({ from: i, to: r1 * 8 + c1 });
    } else if (t.side !== p.side && (p.king || !t.king)) {
      const r2 = r1 + dr;
      const c2 = c1 + dc;
      if (inside(r2, c2) && !b[r2 * 8 + c2]) caps.push({ from: i, to: r2 * 8 + c2, cap: r1 * 8 + c1 });
    }
  }
  return { caps, steps };
}

function legalMoves(b: Board, side: Side, chain: number | null): Move[] {
  if (chain !== null) return pieceMoves(b, chain).caps;
  const caps: Move[] = [];
  const steps: Move[] = [];
  b.forEach((p, i) => {
    if (!p || p.side !== side) return;
    const m = pieceMoves(b, i);
    caps.push(...m.caps);
    steps.push(...m.steps);
  });
  return caps.length ? caps : steps;
}

interface State {
  board: Board;
  turn: Side;
  /** pedina che sta facendo una presa multipla */
  chain: number | null;
  last: Move | null;
  result: Result | null;
}

function applyMove(st: State, m: Move): State {
  const legal = legalMoves(st.board, st.turn, st.chain);
  if (st.result !== null || !legal.some((x) => x.from === m.from && x.to === m.to)) return st;
  const nb = [...st.board];
  const p = { ...nb[m.from]! };
  nb[m.from] = null;
  if (m.cap !== undefined) nb[m.cap] = null;
  const row = m.to >> 3;
  const promoted = !p.king && ((p.side === 0 && row === 0) || (p.side === 1 && row === 7));
  if (promoted) p.king = true;
  nb[m.to] = p;
  if (m.cap !== undefined && !promoted && pieceMoves(nb, m.to).caps.length) {
    return { ...st, board: nb, last: m, chain: m.to };
  }
  const next = other(st.turn);
  if (legalMoves(nb, next, null).length === 0) return { ...st, board: nb, last: m, chain: null, result: st.turn };
  return { ...st, board: nb, last: m, chain: null, turn: next };
}

export default function Dama({ starter, onTurn, onEnd }: GameProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const fit = useFit(1);
  const [s, update] = useShared<State>(() => ({
    board: initial(),
    turn: starter,
    chain: null,
    last: null,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);
  // online chi ha i pezzi azzurri vede la scacchiera girata, con i suoi pezzi in basso
  const flip = useSession().me === 1;

  if (!s) return <Loading />;
  const { board, last } = s;
  const over = s.result !== null;
  const moves = over || !canAct ? [] : legalMoves(board, s.turn, s.chain);
  const mustCapture = moves.length > 0 && moves[0].cap !== undefined;
  const movable = new Set(moves.map((m) => m.from));
  const selected = s.chain ?? (picked !== null && movable.has(picked) ? picked : null);
  const targets = selected === null ? [] : moves.filter((m) => m.from === selected);

  function tap(i: number) {
    if (over || !canAct) return;
    const t = targets.find((m) => m.to === i);
    if (t) {
      buzz(t.cap !== undefined ? [10, 30, 10] : 12);
      setPicked(null);
      update((st) => applyMove(st, t));
      return;
    }
    if (s!.chain !== null) return;
    setPicked(movable.has(i) && i !== selected ? i : null);
  }

  const counts = board.reduce(
    (acc, p) => {
      if (p) acc[p.side]++;
      return acc;
    },
    [0, 0],
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div ref={fit.ref} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className={`grid grid-cols-8 grid-rows-8 overflow-hidden rounded-2xl border-4 border-ink-700 shadow-soft ${flip ? 'rotate-180' : ''}`}
          style={{ width: fit.w, height: fit.h }}
        >
          {board.map((p, i) => {
            const dark = isDark(i);
            const isTarget = targets.some((m) => m.to === i);
            const isSel = selected === i;
            const canMove = movable.has(i) && !over;
            const wasLast = last && (last.from === i || last.to === i);
            return (
              <button
                key={i}
                onClick={() => tap(i)}
                disabled={!dark}
                aria-label={`Casella ${i}`}
                className={`relative flex items-center justify-center ${dark ? 'bg-ink-700' : 'bg-ink-300/80'}`}
              >
                {wasLast && dark && <span className="absolute inset-0 bg-white/[0.07]" />}
                {isTarget && <span className="absolute h-[30%] w-[30%] rounded-full bg-white/50 anim-pop" />}
                {p && (
                  <span
                    className={`relative flex h-[78%] w-[78%] items-center justify-center rounded-full transition-transform ${
                      PC.bg[p.side]
                    } ${isSel ? 'scale-110 ring-4 ring-white' : ''} ${
                      canMove && mustCapture && !isSel ? 'anim-pulse-ring' : ''
                    } ${canMove && !isSel ? 'cursor-pointer' : ''}`}
                    style={{
                      boxShadow:
                        'inset 0 -4px 0 rgba(0,0,0,.22), inset 0 3px 0 rgba(255,255,255,.3), 0 2px 4px rgba(0,0,0,.4)',
                    }}
                  >
                    <span className="absolute inset-[22%] rounded-full border-2 border-black/15" />
                    {p.king && (
                      <Crown
                        className={`relative h-1/2 w-1/2 text-ink-950/75 ${p.side === 1 ? 'rotate-180' : ''}`}
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs font-medium text-ink-400">
        <span className={PC.text[0]}>{counts[0]}</span> pedine · <span className={PC.text[1]}>{counts[1]}</span> pedine
        {mustCapture && !over && <span className="ml-2 text-ink-100">· presa obbligatoria</span>}
      </p>
    </div>
  );
}
