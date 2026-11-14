import Loading from '../components/Loading';
import { buzz, HEX, other, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function Mark({ side, size = 100 }: { side: Side; size?: number }) {
  const s = size;
  if (side === 0) {
    return (
      <svg viewBox="0 0 100 100" width={s} height={s} className="block">
        <path
          d="M24 24 L76 76"
          stroke={HEX[0]}
          strokeWidth="13"
          strokeLinecap="round"
          className="anim-draw"
          style={{ ['--len' as string]: 74 }}
        />
        <path
          d="M76 24 L24 76"
          stroke={HEX[0]}
          strokeWidth="13"
          strokeLinecap="round"
          className="anim-draw"
          style={{ ['--len' as string]: 74, animationDelay: '0.12s' }}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={s} height={s} className="block">
      <circle
        cx="50"
        cy="50"
        r="27"
        fill="none"
        stroke={HEX[1]}
        strokeWidth="12"
        strokeLinecap="round"
        className="anim-draw"
        style={{ ['--len' as string]: 170 }}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

interface State {
  cells: (Side | null)[];
  turn: Side;
  line: number[] | null;
  result: Result | null;
}

export default function Tris({ starter, onTurn, onEnd }: GameProps) {
  const fit = useFit(1);
  const [s, update] = useShared<State>(() => ({ cells: Array(9).fill(null), turn: starter, line: null, result: null }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);

  if (!s) return <Loading />;
  const { cells, line } = s;
  const over = s.result !== null;

  function play(i: number) {
    if (!canAct || over || cells[i] !== null) return;
    buzz();
    update((st) => {
      if (st.result !== null || st.cells[i] !== null) return st;
      const next = [...st.cells];
      next[i] = st.turn;
      const won = LINES.find((l) => l.every((j) => next[j] === st.turn)) ?? null;
      if (won) return { ...st, cells: next, line: won, result: st.turn };
      if (next.every((c) => c !== null)) return { ...st, cells: next, result: 'draw' };
      return { ...st, cells: next, turn: other(st.turn) };
    });
  }

  const cell = fit.w / 3;

  return (
    <div ref={fit.ref} className="flex h-full w-full items-center justify-center">
      <div
        className="relative grid grid-cols-3 grid-rows-3 gap-2 rounded-3xl bg-ink-800 p-2"
        style={{ width: fit.w, height: fit.h }}
      >
        {cells.map((c, i) => {
          const inLine = line?.includes(i);
          return (
            <button
              key={i}
              onClick={() => play(i)}
              aria-label={`Casella ${i + 1}`}
              className={`flex items-center justify-center rounded-2xl transition ${
                inLine ? 'bg-white/15' : 'bg-ink-900'
              } ${c === null && !over && canAct ? 'hover:bg-ink-700 active:bg-ink-700' : ''}`}
            >
              {c !== null && <Mark side={c} size={cell * 0.78} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
