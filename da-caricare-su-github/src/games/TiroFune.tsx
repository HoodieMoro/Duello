import { useEffect, useRef, useState } from 'react';
import { buzz, PC, playerName, type Side } from '../lib/store';
import type { GameProps } from './types';

const STEP = 1 / 24; // ogni tocco sposta il confine di 1/24 della metà schermo

type Phase = 'idle' | 'count' | 'play' | 'over';

export default function TiroFune({ names, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  // pos > 0: il giocatore 1 (in basso) sta vincendo. ±1 = vittoria.
  const [pos, setPos] = useState(0);
  const [taps, setTaps] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<Side | null>(null);
  const posRef = useRef(0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  function start() {
    setPhase('count');
    setCount(3);
    let n = 3;
    timer.current = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(timer.current);
        buzz(40);
        setPhase('play');
      } else {
        buzz(10);
        setCount(n);
      }
    }, 750);
  }

  function press(side: Side) {
    if (phase === 'idle') return start();
    if (phase !== 'play') return;
    const p = Math.max(-1, Math.min(1, posRef.current + (side === 0 ? STEP : -STEP)));
    posRef.current = p;
    setPos(p);
    setTaps((t) => (side === 0 ? [t[0] + 1, t[1]] : [t[0], t[1] + 1]));
    buzz(6);
    if (Math.abs(p) >= 1) {
      const w: Side = p > 0 ? 0 : 1;
      setWinner(w);
      setPhase('over');
      buzz([60, 40, 60]);
      onEnd(w);
    }
  }

  // percentuale dello schermo occupata dal giocatore 2 (in alto)
  const topPct = 50 - pos * 50;

  function Label({ side }: { side: Side }) {
    let big = '';
    let small = '';
    if (phase === 'idle') {
      big = 'Tocca!';
      small = 'Tocca più veloce che puoi per conquistare lo schermo';
    } else if (phase === 'count') {
      big = String(count);
    } else if (phase === 'play') {
      big = 'TIRA!';
      small = `${taps[side]} tocchi`;
    } else {
      big = winner === side ? 'Vittoria!' : 'Sconfitta';
      small = `${taps[side]} tocchi`;
    }
    return (
      <div
        className={`pointer-events-none flex flex-col items-center gap-1 text-center ${side === 1 ? 'rotate-180' : ''}`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-950/60">{playerName(names, side)}</p>
        <p className={`font-display text-5xl font-extrabold text-ink-950 ${phase === 'idle' ? 'anim-blink' : ''}`}>
          {big}
        </p>
        {small && <p className="max-w-[16rem] text-sm font-medium text-ink-950/60">{small}</p>}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full touch-none overflow-hidden bg-ink-950">
      {/* territori */}
      <div
        className={`absolute inset-x-0 top-0 ${PC.bg[1]} transition-[height] duration-100 ease-out`}
        style={{ height: `${topPct}%` }}
      />
      <div
        className={`absolute inset-x-0 bottom-0 ${PC.bg[0]} transition-[height] duration-100 ease-out`}
        style={{ height: `${100 - topPct}%` }}
      />
      {/* corda / confine */}
      <div
        className="absolute inset-x-0 z-10 flex -translate-y-1/2 items-center transition-[top] duration-100 ease-out"
        style={{ top: `${topPct}%` }}
      >
        <div className="h-2 flex-1 bg-[repeating-linear-gradient(45deg,#d6b98c_0_8px,#a8875a_8px_16px)] shadow-[0_2px_8px_rgba(0,0,0,.4)]" />
        <div className="h-8 w-8 rounded-full border-4 border-ink-950 bg-white" />
        <div className="h-2 flex-1 bg-[repeating-linear-gradient(45deg,#d6b98c_0_8px,#a8875a_8px_16px)] shadow-[0_2px_8px_rgba(0,0,0,.4)]" />
      </div>
      {/* linea di metà campo */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-ink-950/25" />

      {/* zone di tocco fisse: metà schermo ciascuno */}
      {([1, 0] as Side[]).map((side) => (
        <div
          key={side}
          onPointerDown={(e) => {
            e.preventDefault();
            press(side);
          }}
          className={`absolute inset-x-0 z-20 flex cursor-pointer items-center justify-center ${
            side === 1 ? 'top-0 h-1/2' : 'bottom-0 h-1/2'
          }`}
        >
          <Label side={side} />
        </div>
      ))}
    </div>
  );
}
