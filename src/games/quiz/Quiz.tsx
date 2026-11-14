import { useEffect, useState } from 'react';
import { Check, Timer, X } from 'lucide-react';
import Loading from '../../components/Loading';
import { buzz, other, PC, playerName, type Result, type Side } from '../../lib/store';
import { useCanAct, useReport, useSession, useShared } from '../../online/shared';
import type { GameProps } from '../types';
import { CATEGORIE } from './domande';

const SECONDS = 20;
const FEEDBACK_MS = 1900;

interface Q {
  cat: string;
  text: string;
  options: string[];
  correct: number;
}
interface State {
  phase: 'setup' | 'play';
  cats: string[];
  perPlayer: number;
  questions: Q[];
  idx: number;
  askedAt: number;
  answer: { choice: number | null; correct: boolean } | null;
  scores: [number, number];
  turn: Side;
  starter: Side;
  result: Result | null;
}

function shuffle<T>(a: T[]): T[] {
  const d = [...a];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function start(st: State): State {
  if (st.phase !== 'setup' || st.cats.length === 0) return st;
  const pool = CATEGORIE.filter((c) => st.cats.includes(c.id)).flatMap((c) => c.domande.map((d) => ({ c, d })));
  const picked = shuffle(pool).slice(0, Math.min(pool.length - (pool.length % 2), st.perPlayer * 2));
  const questions: Q[] = picked.map(({ c, d }) => {
    const order = shuffle([0, 1, 2, 3]);
    return { cat: c.id, text: d[0], options: order.map((k) => d[k + 1]), correct: order.indexOf(0) };
  });
  return { ...st, phase: 'play', questions, idx: 0, askedAt: Date.now(), answer: null, turn: st.starter };
}

function answer(st: State, idx: number, choice: number | null): State {
  if (st.phase !== 'play' || st.idx !== idx || st.answer || st.result !== null) return st;
  const q = st.questions[idx];
  const correct = choice === q.correct;
  const scores = [...st.scores] as [number, number];
  if (correct) scores[st.turn] += 1;
  return { ...st, answer: { choice, correct }, scores };
}

function advance(st: State, idx: number): State {
  if (st.idx !== idx || !st.answer) return st;
  if (idx + 1 >= st.questions.length) {
    const [a, b] = st.scores;
    return { ...st, result: a === b ? 'draw' : a > b ? 0 : 1 };
  }
  return { ...st, idx: idx + 1, askedAt: Date.now(), answer: null, turn: other(st.turn) };
}

export default function Quiz({ starter, names, onTurn, onEnd }: GameProps) {
  const { me } = useSession();
  const [s, update] = useShared<State>(() => ({
    phase: 'setup',
    cats: CATEGORIE.map((c) => c.id),
    perPlayer: 5,
    questions: [],
    idx: 0,
    askedAt: 0,
    answer: null,
    scores: [0, 0],
    turn: starter,
    starter,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);
  const [now, setNow] = useState(Date.now());

  const playing = s?.phase === 'play' && s.result === null;
  const idx = s?.idx ?? 0;
  const answered = !!s?.answer;
  const askedAt = s?.askedAt ?? 0;

  // orologio per la barra del tempo
  useEffect(() => {
    if (!playing || answered) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [playing, answered, idx]);

  // tempo scaduto (chi risponde lo segnala subito, l'altro telefono con un po' di margine)
  useEffect(() => {
    if (!playing || answered) return;
    const margin = canAct ? 0 : 3000;
    const wait = Math.max(0, askedAt + SECONDS * 1000 + margin - Date.now());
    const t = window.setTimeout(() => update((x) => answer(x, idx, null)), wait);
    return () => window.clearTimeout(t);
  }, [playing, answered, idx, askedAt, canAct, update]);

  // dopo la risposta, si passa alla domanda successiva
  useEffect(() => {
    if (!playing || !answered) return;
    const t = window.setTimeout(() => update((x) => advance(x, idx)), FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [playing, answered, idx, update]);

  if (!s) return <Loading />;
  const nm = (x: Side) => playerName(names, x);

  // ───── Impostazioni ─────
  if (s.phase === 'setup') {
    const toggle = (id: string) =>
      update((x) =>
        x.phase !== 'setup'
          ? x
          : { ...x, cats: x.cats.includes(id) ? x.cats.filter((c) => c !== id) : [...x.cats, id] },
      );
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        <div>
          <p className="font-display text-xl font-extrabold">Scegli le materie</p>
          <p className="text-sm text-ink-400">
            A turno rispondete a domande delle materie scelte: {SECONDS} secondi per domanda.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIE.map((c) => {
            const on = s.cats.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold ring-1 transition ${
                  on ? 'bg-white/10 text-ink-50 ring-white/30' : 'bg-ink-900 text-ink-500 ring-white/5'
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="min-w-0 flex-1 leading-tight">{c.nome}</span>
                {on && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Domande a testa</p>
          <div className="flex gap-2">
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => update((x) => (x.phase !== 'setup' ? x : { ...x, perPlayer: n }))}
                className={`btn flex-1 ${s.perPlayer === n ? 'bg-ink-100 text-ink-950' : 'bg-white/5 text-ink-200'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn-primary mt-auto py-3.5 text-base"
          disabled={s.cats.length === 0}
          onClick={() => update(start)}
        >
          Inizia · comincia {nm(s.starter)}
        </button>
      </div>
    );
  }

  // ───── Domanda ─────
  const q = s.questions[s.idx];
  const cat = CATEGORIE.find((c) => c.id === q.cat)!;
  const left = Math.max(0, SECONDS - (now - s.askedAt) / 1000);
  const total = s.questions.length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        {([0, 1] as Side[]).map((x) => (
          <span key={x} className={`font-semibold ${PC.text[x]} ${x === 1 ? 'order-3' : ''}`}>
            {nm(x)} <span className="font-display text-lg font-extrabold tabular-nums text-ink-50">{s.scores[x]}</span>
          </span>
        ))}
        <span className="order-2 text-xs text-ink-400">
          {s.idx + 1} / {total}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${left < 5 ? 'bg-p1' : 'bg-emerald-400'} transition-[width] duration-200 ease-linear`}
          style={{ width: `${s.answer ? 0 : (left / SECONDS) * 100}%` }}
        />
      </div>

      <div key={s.idx} className="anim-fade-up flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-ink-400">
          <span>
            {cat.emoji} {cat.nome}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {Math.ceil(left)} s
          </span>
        </div>
        <p className={`text-sm font-semibold ${PC.text[s.turn]}`}>
          {me === null ? `Domanda per ${nm(s.turn)}` : s.turn === me ? 'Tocca a te!' : `Risponde ${nm(s.turn)}…`}
        </p>
        <p className="font-display text-2xl font-extrabold leading-snug">{q.text}</p>

        <div className="mt-auto grid gap-2">
          {q.options.map((o, i) => {
            const isRight = i === q.correct;
            const chosen = s.answer?.choice === i;
            const shown = !!s.answer;
            return (
              <button
                key={i}
                disabled={!canAct || shown}
                onClick={() => {
                  buzz(isRight ? [10, 40, 10] : [40, 30, 40]);
                  update((x) => answer(x, s.idx, i));
                }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold ring-1 transition ${
                  shown && isRight
                    ? 'bg-emerald-500/25 text-emerald-100 ring-emerald-400'
                    : shown && chosen
                      ? 'bg-p1/25 text-rose-100 ring-p1'
                      : 'bg-ink-900 ring-white/10 enabled:hover:bg-ink-800 enabled:active:scale-[0.99]'
                } ${shown && !isRight && !chosen ? 'opacity-50' : ''}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">
                  {shown && isRight ? (
                    <Check className="h-4 w-4" />
                  ) : shown && chosen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    'ABCD'[i]
                  )}
                </span>
                {o}
              </button>
            );
          })}
        </div>
        <p className="h-5 text-center text-sm font-semibold">
          {s.answer &&
            (s.answer.correct ? (
              <span className="text-emerald-300">Giusto! +1 a {nm(s.turn)}</span>
            ) : s.answer.choice === null ? (
              <span className="text-amber-300">Tempo scaduto!</span>
            ) : (
              <span className="text-rose-300">Sbagliato</span>
            ))}
        </p>
      </div>
    </div>
  );
}
