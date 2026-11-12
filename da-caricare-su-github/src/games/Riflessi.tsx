import { useEffect, useRef, useState } from 'react';
import { buzz, other, PC, playerName, type Side } from '../lib/store';
import type { GameProps } from './types';

const TARGET = 3; // round da vincere

type Phase =
  | { kind: 'idle' }
  | { kind: 'wait' }
  | { kind: 'go'; at: number }
  | { kind: 'round'; winner: Side; reason: 'fast' | 'early'; ms?: number }
  | { kind: 'over'; winner: Side };

export default function Riflessi({ names, onEnd }: GameProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const timer = useRef<number>();
  const lockUntil = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function startRound() {
    setPhase({ kind: 'wait' });
    timer.current = window.setTimeout(
      () => {
        buzz(30);
        setPhase({ kind: 'go', at: performance.now() });
      },
      1400 + Math.random() * 3200,
    );
  }

  function award(winner: Side, reason: 'fast' | 'early', ms?: number) {
    const next = [...score] as [number, number];
    next[winner]++;
    setScore(next);
    lockUntil.current = performance.now() + 900;
    if (next[winner] >= TARGET) {
      setPhase({ kind: 'over', winner });
      onEnd(winner);
    } else {
      setPhase({ kind: 'round', winner, reason, ms });
    }
  }

  function press(side: Side) {
    const now = performance.now();
    switch (phase.kind) {
      case 'idle':
        buzz(8);
        startRound();
        break;
      case 'round':
        if (now < lockUntil.current) return;
        buzz(8);
        startRound();
        break;
      case 'wait':
        window.clearTimeout(timer.current);
        buzz([40, 30, 40]);
        award(other(side), 'early');
        break;
      case 'go':
        buzz(20);
        award(side, 'fast', Math.round(now - phase.at));
        break;
    }
  }

  const bg = phase.kind === 'wait' ? 'bg-amber-500/90' : phase.kind === 'go' ? 'bg-emerald-400' : 'bg-ink-900';

  function Half({ side }: { side: Side }) {
    const me = playerName(names, side);
    let title = '';
    let sub = '';
    let mine = false;
    switch (phase.kind) {
      case 'idle':
        title = 'Pronti?';
        sub = 'Tocca per iniziare. Quando lo schermo diventa verde, tocca il prima possibile!';
        break;
      case 'wait':
        title = 'Aspetta…';
        sub = 'Non toccare ancora';
        break;
      case 'go':
        title = 'ORA!';
        break;
      case 'round':
        mine = phase.winner === side;
        title = mine ? '+1' : phase.reason === 'early' ? 'Troppo presto!' : 'Più lento…';
        sub =
          phase.reason === 'fast'
            ? `${playerName(names, phase.winner)}: ${phase.ms} ms`
            : mine
              ? `${playerName(names, other(side))} è partito/a in anticipo`
              : 'Hai toccato prima del verde';
        sub += ' · tocca per il prossimo round';
        break;
      case 'over':
        mine = phase.winner === side;
        title = mine ? 'Hai vinto!' : 'Hai perso';
        break;
    }
    return (
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          press(side);
        }}
        className={`relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center ${
          side === 1 ? 'rotate-180' : ''
        }`}
      >
        <p
          className={`text-sm font-semibold uppercase tracking-widest ${phase.kind === 'go' || phase.kind === 'wait' ? 'text-ink-950/70' : PC.text[side]}`}
        >
          {me}
        </p>
        <p
          className={`font-display font-extrabold leading-none ${
            phase.kind === 'go' ? 'text-7xl text-ink-950' : phase.kind === 'wait' ? 'text-5xl text-ink-950' : 'text-5xl'
          } ${mine ? PC.text[side] : ''} ${phase.kind === 'idle' ? 'anim-blink' : ''}`}
        >
          {title}
        </p>
        {sub && (
          <p className={`max-w-xs text-sm ${phase.kind === 'wait' ? 'text-ink-950/70' : 'text-ink-400'}`}>{sub}</p>
        )}
        <div className="mt-2 flex gap-2">
          {Array.from({ length: TARGET }, (_, k) => (
            <span
              key={k}
              className={`h-3 w-3 rounded-full ${
                k < score[side]
                  ? PC.bg[side]
                  : phase.kind === 'go' || phase.kind === 'wait'
                    ? 'bg-ink-950/20'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full touch-none flex-col transition-colors duration-75 ${bg}`}>
      <Half side={1} />
      <div className={`h-px ${phase.kind === 'go' || phase.kind === 'wait' ? 'bg-ink-950/20' : 'bg-white/10'}`} />
      <Half side={0} />
    </div>
  );
}
