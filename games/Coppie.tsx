import { useEffect } from 'react';
import Loading from '../components/Loading';
import { buzz, other, PC, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

const COLS = 4;
const ROWS = 5;
const SYMBOLS = ['🍕', '🚀', '🐙', '🌵', '🎸', '🦊', '🍉', '⚽️', '🌈', '🎲', '🦄', '🍩'];

function deal(): string[] {
  const pick = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, (COLS * ROWS) / 2);
  const deck = [...pick, ...pick];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface State {
  deck: string[];
  owner: (Side | null)[];
  open: number[];
  /** due carte scoperte in attesa di essere risolte (coppia o no) */
  pending: 'match' | 'miss' | null;
  turn: Side;
  result: Result | null;
}

function resolve(st: State): State {
  if (!st.pending || st.open.length !== 2) return st;
  const [a, b] = st.open;
  if (st.pending === 'miss') return { ...st, open: [], pending: null, turn: other(st.turn) };
  const owner = [...st.owner];
  owner[a] = st.turn;
  owner[b] = st.turn;
  let result: Result | null = null;
  if (owner.every((o) => o !== null)) {
    const p0 = owner.filter((o) => o === 0).length;
    const p1 = owner.length - p0;
    result = p0 === p1 ? 'draw' : p0 > p1 ? 0 : 1;
  }
  return { ...st, owner, open: [], pending: null, result };
}

export default function Coppie({ starter, onTurn, onEnd }: GameProps) {
  const fit = useFit(COLS / ROWS);
  const [s, update] = useShared<State>(() => ({
    deck: deal(),
    owner: Array(COLS * ROWS).fill(null),
    open: [],
    pending: null,
    turn: starter,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);
  const pending = s?.pending ?? null;

  // dopo un attimo le carte scoperte si risolvono (lo fanno entrambi i telefoni: la seconda volta non cambia niente)
  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(
      () => {
        if (pending === 'match') buzz([10, 40, 10]);
        update(resolve);
      },
      pending === 'match' ? 550 : 1100,
    );
    return () => window.clearTimeout(t);
  }, [pending, update]);

  if (!s) return <Loading />;
  const { deck, owner, open } = s;
  const miss = pending === 'miss';

  function flip(i: number) {
    if (!canAct || pending || owner[i] !== null || open.includes(i)) return;
    buzz(8);
    update((st) => {
      if (st.pending || st.result !== null || st.owner[i] !== null || st.open.includes(i) || st.open.length >= 2)
        return st;
      const now = [...st.open, i];
      if (now.length < 2) return { ...st, open: now };
      return { ...st, open: now, pending: st.deck[now[0]] === st.deck[now[1]] ? 'match' : 'miss' };
    });
  }

  const pairs = [owner.filter((o) => o === 0).length / 2, owner.filter((o) => o === 1).length / 2];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div ref={fit.ref} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className="grid gap-2"
          style={{
            width: fit.w,
            height: fit.h,
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {deck.map((sym, i) => {
            const o = owner[i];
            const shown = o !== null || open.includes(i);
            return (
              <button key={i} onClick={() => flip(i)} className="card-3d" aria-label={shown ? sym : 'Carta coperta'}>
                <div className={`card-inner ${shown ? 'is-flipped' : ''}`}>
                  <div className="card-face flex items-center justify-center rounded-2xl bg-ink-700 shadow-soft">
                    <div className="h-[46%] w-[46%] rounded-xl border-2 border-dashed border-white/10" />
                  </div>
                  <div
                    className={`card-face card-back flex items-center justify-center rounded-2xl ${
                      o !== null ? `${PC.bgSoft[o]} ring-2 ${PC.ring[o]}` : miss ? 'bg-ink-100/90' : 'bg-ink-100'
                    }`}
                  >
                    <span style={{ fontSize: (fit.w / COLS) * 0.42 }} className="leading-none">
                      {sym}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-sm font-semibold tabular-nums">
        <span className={PC.text[0]}>{pairs[0]}</span>
        <span className="mx-2 text-ink-500">coppie</span>
        <span className={PC.text[1]}>{pairs[1]}</span>
      </p>
    </div>
  );
}
