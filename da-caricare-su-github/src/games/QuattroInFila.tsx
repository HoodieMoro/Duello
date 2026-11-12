import { useState } from 'react';
import Loading from '../components/Loading';
import { buzz, other, PC, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

const COLS = 7;
const ROWS = 6;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

type Grid = (Side | null)[]; // indice = r * COLS + c, r = 0 in alto

function findWin(g: Grid, r: number, c: number, side: Side): number[] | null {
  for (const [dr, dc] of DIRS) {
    const cells = [r * COLS + c];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr * COLS + cc] === side) {
        cells.push(rr * COLS + cc);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

interface State {
  grid: Grid;
  turn: Side;
  win: number[] | null;
  result: Result | null;
}

export default function QuattroInFila({ starter, onTurn, onEnd }: GameProps) {
  const [hover, setHover] = useState<number | null>(null);
  const fit = useFit(COLS / ROWS);
  const [s, update] = useShared<State>(() => ({
    grid: Array(ROWS * COLS).fill(null),
    turn: starter,
    win: null,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);

  if (!s) return <Loading />;
  const { grid, win } = s;
  const over = s.result !== null;

  function drop(c: number) {
    if (!canAct || over || grid[c] !== null) return;
    buzz();
    update((st) => {
      if (st.result !== null) return st;
      let r = ROWS - 1;
      while (r >= 0 && st.grid[r * COLS + c] !== null) r--;
      if (r < 0) return st;
      const next = [...st.grid];
      next[r * COLS + c] = st.turn;
      const w = findWin(next, r, c, st.turn);
      if (w) return { ...st, grid: next, win: w, result: st.turn };
      if (next.every((x) => x !== null)) return { ...st, grid: next, result: 'draw' };
      return { ...st, grid: next, turn: other(st.turn) };
    });
  }

  const pad = 8;
  const cell = (fit.w - pad * 2) / COLS;

  return (
    <div ref={fit.ref} className="flex h-full w-full items-center justify-center">
      <div
        className="relative rounded-3xl bg-ink-800 shadow-soft"
        style={{ width: fit.w, height: fit.h, padding: pad }}
        onMouseLeave={() => setHover(null)}
      >
        <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              onClick={() => drop(c)}
              onMouseEnter={() => setHover(c)}
              aria-label={`Colonna ${c + 1}`}
              className={`grid h-full rounded-2xl transition-colors ${hover === c && !over && canAct ? 'bg-white/[0.04]' : ''}`}
              style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
            >
              {Array.from({ length: ROWS }, (_, r) => {
                const v = grid[r * COLS + c];
                const winning = win?.includes(r * COLS + c);
                return (
                  <div key={r} className="flex items-center justify-center p-[9%]">
                    <div className="relative h-full w-full overflow-visible rounded-full bg-ink-950 shadow-[inset_0_2px_6px_rgba(0,0,0,.6)]">
                      {v !== null && (
                        <div
                          className={`anim-drop absolute inset-0 rounded-full ${PC.bg[v]} ${
                            winning ? 'anim-pulse-ring ring-4 ring-white' : ''
                          } ${win && !winning ? 'opacity-40' : ''}`}
                          style={{
                            ['--from' as string]: `${-(r + 1) * (cell / (cell * 0.82)) * 100}%`,
                            ['--dur' as string]: `${0.18 + r * 0.045}s`,
                            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,.18), inset 0 3px 0 rgba(255,255,255,.25)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
