import { useState } from 'react';
import { Send, X } from 'lucide-react';
import Loading from '../../components/Loading';
import { buzz, other, PC, playerName, type Result, type Side } from '../../lib/store';
import { useCanAct, useReport, useShared } from '../../online/shared';
import type { GameProps } from '../types';
import { DOMANDE } from './domande';
import { matchAnswer } from './match';

const ROUNDS = 4;
const STRIKES = 3;

// ───────────── Stato ─────────────

interface Guess {
  who: Side;
  text: string;
  hit: number; // indice indovinato, -1 sbagliata, -2 già uscita
}
interface State {
  order: number[]; // domande scelte
  round: number; // 0..ROUNDS-1
  starter: Side;
  turn: Side;
  revealed: boolean[];
  strikes: number;
  phase: 'guess' | 'steal' | 'end';
  bank: number;
  roundWinner: Side | null;
  last: Guess | null;
  scores: [number, number];
  result: Result | null;
}

const roundLead = (st: State) => (st.round % 2 === 0 ? st.starter : other(st.starter));
const question = (st: State) => DOMANDE[st.order[st.round]];

/** Domande già uscite su questo telefono: si ripescano solo quando le hai viste tutte. */
const USED_KEY = 'duello:sondaggio-usate';
function pickQuestions(): number[] {
  let used: string[] = [];
  try {
    used = JSON.parse(localStorage.getItem(USED_KEY) || '[]');
  } catch {
    /* niente memoria: va bene lo stesso */
  }
  const shuffled = [...DOMANDE.keys()].sort(() => Math.random() - 0.5);
  let fresh = shuffled.filter((i) => !used.includes(DOMANDE[i][0]));
  if (fresh.length < ROUNDS) {
    used = [];
    fresh = shuffled;
  }
  const order = fresh.slice(0, ROUNDS);
  try {
    localStorage.setItem(USED_KEY, JSON.stringify([...used, ...order.map((i) => DOMANDE[i][0])]));
  } catch {
    /* pazienza */
  }
  return order;
}

function init(starter: Side): State {
  const order = pickQuestions();
  return {
    order,
    round: 0,
    starter,
    turn: starter,
    revealed: Array(DOMANDE[order[0]][1].length).fill(false),
    strikes: 0,
    phase: 'guess',
    bank: 0,
    roundWinner: null,
    last: null,
    scores: [0, 0],
    result: null,
  };
}

function endRound(st: State, winner: Side, extra = 0): State {
  const scores = [...st.scores] as [number, number];
  scores[winner] += st.bank + extra;
  return { ...st, scores, phase: 'end', roundWinner: winner, revealed: st.revealed.map(() => true) };
}

function guess(st: State, side: Side, text: string): State {
  if (st.result !== null || st.phase === 'end' || st.turn !== side || !text.trim()) return st;
  const answers = question(st)[1];
  const i = matchAnswer(text, answers);
  const fresh = i >= 0 && !st.revealed[i];
  const last: Guess = { who: side, text: text.trim(), hit: fresh ? i : i >= 0 ? -2 : -1 };

  if (st.phase === 'steal') {
    if (fresh) {
      const revealed = [...st.revealed];
      revealed[i] = true;
      return endRound({ ...st, revealed, last }, side, answers[i][1]);
    }
    return endRound({ ...st, last }, other(side));
  }

  if (fresh) {
    const revealed = [...st.revealed];
    revealed[i] = true;
    const bank = st.bank + answers[i][1];
    const next = { ...st, revealed, bank, last };
    return revealed.every(Boolean) ? endRound(next, side) : next;
  }
  const strikes = st.strikes + 1;
  if (strikes >= STRIKES) return { ...st, strikes, last, phase: 'steal', turn: other(side) };
  return { ...st, strikes, last };
}

function nextRound(st: State): State {
  if (st.phase !== 'end' || st.result !== null) return st;
  if (st.round + 1 >= ROUNDS) {
    const [a, b] = st.scores;
    return { ...st, result: a === b ? 'draw' : a > b ? 0 : 1 };
  }
  const round = st.round + 1;
  const lead = round % 2 === 0 ? st.starter : other(st.starter);
  return {
    ...st,
    round,
    turn: lead,
    revealed: Array(DOMANDE[st.order[round]][1].length).fill(false),
    strikes: 0,
    phase: 'guess',
    bank: 0,
    roundWinner: null,
    last: null,
  };
}

// ───────────── Interfaccia ─────────────

export default function Sondaggio({ starter, names, onTurn, onEnd }: GameProps) {
  const [s, update] = useShared<State>(() => init(starter));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);
  const [text, setText] = useState('');

  if (!s) return <Loading />;
  const nm = (x: Side) => playerName(names, x);
  const [qText, answers] = question(s);
  const lead = roundLead(s);

  function send() {
    if (!text.trim() || !canAct) return;
    const i = matchAnswer(text, answers);
    buzz(i >= 0 && !s!.revealed[i] ? [10, 40, 10] : [60, 40, 60]);
    const t = text;
    setText('');
    update((x) => guess(x, x.turn, t));
  }

  const last = s.last;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        {([0, 1] as Side[]).map((x) => (
          <span key={x} className={`font-semibold ${PC.text[x]} ${x === 1 ? 'order-3' : ''}`}>
            {nm(x)} <span className="font-display text-lg font-extrabold tabular-nums text-ink-50">{s.scores[x]}</span>
          </span>
        ))}
        <span className="order-2 text-xs text-ink-400">
          Round {s.round + 1}/{ROUNDS}
        </span>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/20 p-4 text-center ring-1 ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300">
          Le risposte più date · punteggi stimati
        </p>
        <p className="mt-1 font-display text-xl font-extrabold leading-snug">{qText}</p>
      </div>

      {/* tabellone */}
      <div className="grid grid-cols-1 gap-1.5">
        {answers.map((a, i) => {
          const open = s.revealed[i];
          const justHit = last?.hit === i;
          return (
            <div
              key={i}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 ring-1 ${
                open
                  ? `bg-amber-300 text-ink-950 ring-amber-200 ${justHit ? 'anim-pop' : ''}`
                  : 'bg-indigo-950/70 ring-indigo-400/20'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${open ? 'bg-ink-950/15' : 'bg-indigo-400/20 text-indigo-200'}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate font-semibold">{open ? a[0] : ''}</span>
              <span className="font-display text-lg font-extrabold tabular-nums">{open ? a[1] : ''}</span>
            </div>
          );
        })}
      </div>

      {/* stato del round */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: STRIKES }, (_, k) => (
            <span
              key={k}
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${k < s.strikes ? 'bg-p1-deep text-white' : 'bg-white/5 text-ink-600'}`}
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </span>
          ))}
        </div>
        <span className="text-ink-300">
          In palio <b className="font-display text-lg text-ink-50">{s.bank}</b>
        </span>
      </div>

      <p className="min-h-[2.5rem] text-center text-sm text-ink-300">
        {last && (
          <span className="block">
            {nm(last.who)}: “{last.text}” →{' '}
            {last.hit >= 0 ? (
              <b className="text-amber-300">c’è!</b>
            ) : last.hit === -2 ? (
              <b className="text-ink-400">già uscita</b>
            ) : (
              <b className="text-rose-300">non c’è</b>
            )}
          </span>
        )}
        {s.phase === 'guess' && (
          <span className={PC.text[s.turn]}>
            {canAct ? 'Tocca a te: scrivi una risposta' : `Risponde ${nm(s.turn)}…`}
          </span>
        )}
        {s.phase === 'steal' && (
          <span className={PC.text[s.turn]}>
            Tre errori! {canAct ? 'Hai un tentativo per rubare i punti' : `${nm(s.turn)} prova a rubare i punti…`}
          </span>
        )}
        {s.phase === 'end' && s.roundWinner !== null && (
          <span className="font-semibold">
            <span className={PC.text[s.roundWinner]}>{nm(s.roundWinner)}</span>{' '}
            {s.roundWinner === lead ? 'vince il round' : 'ruba i punti'}!
          </span>
        )}
      </p>

      <div className="mt-auto">
        {s.phase === 'end' ? (
          s.result === null && (
            <button className="btn-primary w-full py-3" onClick={() => update(nextRound)}>
              {s.round + 1 >= ROUNDS ? 'Vedi il risultato' : 'Prossimo round'}
            </button>
          )
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canAct}
              placeholder={canAct ? 'La tua risposta…' : 'Aspetta il tuo turno'}
              autoComplete="off"
              autoCorrect="off"
              className="min-w-0 flex-1 rounded-2xl bg-ink-900 px-4 py-3 font-semibold text-ink-50 outline-none ring-1 ring-white/10 placeholder:text-ink-500 focus:ring-white/30 disabled:opacity-50"
            />
            <button type="submit" className="btn-primary px-4" disabled={!canAct || !text.trim()} aria-label="Invia">
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
