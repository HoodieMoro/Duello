import { useState } from 'react';
import { Ban, Hand, Layers, Repeat2 } from 'lucide-react';
import Loading from '../components/Loading';
import { PassScreen, usePrivateView } from '../components/PassScreen';
import { buzz, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useFit } from '../lib/useFit';
import { useReport, useShared } from '../online/shared';
import type { GameProps } from './types';

/*
 * Ultima carta: gioco di carte a colori in cui si scartano carte dello stesso colore o valore.
 * Per due giocatori "Inverti" vale come "Salta". Chi resta con una carta deve aver premuto "Ultima!",
 * altrimenti ne pesca due di penalità. Vince chi finisce per primo le carte.
 */

type Color = 'r' | 'g' | 'b' | 'y';
type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'salta' | 'inverti' | '+2' | 'jolly' | '+4';
interface UCard {
  id: number;
  c: Color | 'w';
  v: Value;
}

const COLORS: Color[] = ['r', 'g', 'b', 'y'];
const COLOR_HEX: Record<Color | 'w', string> = { r: '#ef4444', g: '#22c55e', b: '#3b82f6', y: '#eab308', w: '#18181b' };
const COLOR_NAME: Record<Color, string> = { r: 'rosso', g: 'verde', b: 'blu', y: 'giallo' };
const START_HAND = 7;

function newDeck(): UCard[] {
  const d: UCard[] = [];
  let id = 0;
  for (const c of COLORS) {
    d.push({ id: id++, c, v: '0' });
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'salta', 'inverti', '+2'] as Value[]) {
      d.push({ id: id++, c, v });
      d.push({ id: id++, c, v });
    }
  }
  for (let i = 0; i < 4; i++) {
    d.push({ id: id++, c: 'w', v: 'jolly' });
    d.push({ id: id++, c: 'w', v: '+4' });
  }
  return shuffle(d);
}

function shuffle<T>(a: T[]): T[] {
  const d = [...a];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

interface State {
  deck: UCard[];
  discard: UCard[]; // l'ultima è quella in cima
  color: Color;
  hands: [UCard[], UCard[]];
  turn: Side;
  drew: boolean; // ha già pescato in questo turno
  called: [boolean, boolean]; // ha detto "Ultima!"
  log: string;
  result: Result | null;
}

function init(starter: Side): State {
  let deck = newDeck();
  const hands: [UCard[], UCard[]] = [[], []];
  for (let i = 0; i < START_HAND; i++) {
    hands[0].push(deck.pop()!);
    hands[1].push(deck.pop()!);
  }
  // prima carta scoperta: un numero
  const idx = deck.findIndex((c) => c.c !== 'w' && /^\d$/.test(c.v));
  const first = deck[idx];
  deck = deck.filter((_, i) => i !== idx);
  return {
    deck,
    discard: [first],
    color: first.c as Color,
    hands,
    turn: starter,
    drew: false,
    called: [false, false],
    log: '',
    result: null,
  };
}

const top = (st: State) => st.discard[st.discard.length - 1];
const playable = (st: State, c: UCard) => c.c === 'w' || c.c === st.color || c.v === top(st).v;

/** pesca n carte, rimescolando gli scarti se il mazzo finisce */
function drawN(st: State, side: Side, n: number): State {
  let deck = [...st.deck];
  let discard = [...st.discard];
  const hand = [...st.hands[side]];
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      if (discard.length <= 1) break;
      deck = shuffle(discard.slice(0, -1));
      discard = discard.slice(-1);
    }
    hand.push(deck.pop()!);
  }
  const hands = [...st.hands] as [UCard[], UCard[]];
  hands[side] = hand;
  return { ...st, deck, discard, hands };
}

const label = (c: UCard) =>
  c.v === 'salta' ? 'Salta' : c.v === 'inverti' ? 'Inverti' : c.v === 'jolly' ? 'Jolly' : c.v;

function playCard(st: State, side: Side, id: number, chosen: Color | null, names: [string, string]): State {
  if (st.result !== null || st.turn !== side) return st;
  const card = st.hands[side].find((c) => c.id === id);
  if (!card || !playable(st, card)) return st;
  if (card.c === 'w' && !chosen) return st;
  const hands = [...st.hands] as [UCard[], UCard[]];
  hands[side] = hands[side].filter((c) => c.id !== id);
  let next: State = {
    ...st,
    hands,
    discard: [...st.discard, card],
    color: card.c === 'w' ? chosen! : card.c,
    drew: false,
  };
  const opp = other(side);
  const who = names[side];
  let log = `${who} ha giocato ${label(card)}${card.c === 'w' ? ` e ha scelto il ${COLOR_NAME[chosen!]}` : ''}`;

  if (hands[side].length === 0) return { ...next, log, result: side };

  // "Ultima!" dimenticato: due carte di penalità
  const called = [...st.called] as [boolean, boolean];
  if (hands[side].length === 1 && !called[side]) {
    next = drawN(next, side, 2);
    log += `, ma non ha detto "Ultima!": pesca 2 carte`;
  }
  called[side] = false;
  next = { ...next, called };

  let again = false;
  if (card.v === 'salta' || card.v === 'inverti') {
    again = true;
    log += ` — ${names[opp]} salta il turno`;
  } else if (card.v === '+2' || card.v === '+4') {
    const n = card.v === '+2' ? 2 : 4;
    next = drawN(next, opp, n);
    again = true;
    log += ` — ${names[opp]} pesca ${n} carte e salta il turno`;
  }
  return { ...next, log, turn: again ? side : opp };
}

function draw(st: State, side: Side, names: [string, string]): State {
  if (st.result !== null || st.turn !== side || st.drew) return st;
  return { ...drawN(st, side, 1), drew: true, log: `${names[side]} ha pescato una carta` };
}

function pass(st: State, side: Side, names: [string, string]): State {
  if (st.result !== null || st.turn !== side || !st.drew) return st;
  return { ...st, drew: false, turn: other(side), log: `${names[side]} ha passato` };
}

function callLast(st: State, side: Side): State {
  if (st.turn !== side || st.hands[side].length !== 2 || st.called[side]) return st;
  const called = [...st.called] as [boolean, boolean];
  called[side] = true;
  return { ...st, called };
}

function UCardView({
  card,
  w,
  onClick,
  disabled,
  dim,
}: {
  card: UCard | null;
  w: number;
  onClick?: () => void;
  disabled?: boolean;
  dim?: boolean;
}) {
  const h = Math.round(w * 1.5);
  const Tag = onClick ? 'button' : 'div';
  if (!card) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-[14%/9%] border-2 border-white/80 bg-ink-900 shadow-[0_2px_6px_rgba(0,0,0,.35)]"
        style={{ width: w, height: h }}
      >
        <span className="-rotate-12 font-display font-extrabold text-p1" style={{ fontSize: w * 0.22 }}>
          ULTIMA
        </span>
      </div>
    );
  }
  const bg = COLOR_HEX[card.c];
  const icon =
    card.v === 'salta' ? (
      <Ban style={{ width: w * 0.42, height: w * 0.42 }} strokeWidth={3} />
    ) : card.v === 'inverti' ? (
      <Repeat2 style={{ width: w * 0.42, height: w * 0.42 }} strokeWidth={3} />
    ) : card.v === 'jolly' ? (
      <span className="grid grid-cols-2 overflow-hidden rounded-full" style={{ width: w * 0.5, height: w * 0.5 }}>
        {COLORS.map((c) => (
          <span key={c} style={{ background: COLOR_HEX[c] }} />
        ))}
      </span>
    ) : (
      <span
        className="font-display font-extrabold leading-none"
        style={{ fontSize: w * (card.v.length > 1 ? 0.4 : 0.55) }}
      >
        {card.v}
      </span>
    );
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={`${label(card)}${card.c !== 'w' ? ' ' + COLOR_NAME[card.c] : ''}`}
      className={`relative flex shrink-0 items-center justify-center rounded-[14%/9%] border-[3px] border-white text-white shadow-[0_2px_6px_rgba(0,0,0,.35)] transition ${
        dim ? 'opacity-40' : ''
      } ${onClick && !disabled ? 'hover:-translate-y-1 active:scale-95' : ''}`}
      style={{ width: w, height: h, background: bg }}
    >
      <span className="absolute inset-[12%] rounded-[50%] bg-white/15" style={{ transform: 'rotate(-30deg)' }} />
      <span className="relative flex items-center justify-center">{icon}</span>
      {card.v === '+4' && (
        <span className="absolute bottom-[6%] font-display font-extrabold" style={{ fontSize: w * 0.24 }}>
          +4
        </span>
      )}
    </Tag>
  );
}

export default function UltimaCarta({ starter, names, onTurn, onEnd }: GameProps) {
  const fit = useFit(1);
  const nm: [string, string] = [playerName(names, 0), playerName(names, 1)];
  const [s, update] = useShared<State>(() => init(starter));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const view = usePrivateView(s && s.result === null ? s.turn : null);
  const [picking, setPicking] = useState<number | null>(null); // jolly in attesa del colore

  if (!s) return <Loading />;
  if (view.covered && s.result === null) {
    return <PassScreen who={s.turn} names={names} note={s.log || undefined} onReady={view.reveal} />;
  }

  const me = view.viewer;
  const opp = other(me);
  const myTurn = s.result === null && s.turn === me;
  const hand = s.hands[me];
  const t = top(s);

  const w = Math.max(40, Math.min(66, fit.cw / 5.4));

  function tap(c: UCard) {
    if (!myTurn || !playable(s!, c)) return;
    if (c.c === 'w') {
      setPicking(c.id);
      return;
    }
    buzz(10);
    update((x) => playCard(x, me, c.id, null, nm));
  }

  return (
    <div ref={fit.ref} className="relative flex h-full w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${PC.text[opp]}`}>
          {nm[opp]} <span className="font-normal text-ink-400">· {s.hands[opp].length} carte</span>
        </p>
        {s.hands[opp].length === 1 && (
          <span className="anim-pop rounded-full bg-p1/20 px-2.5 py-1 text-xs font-bold text-p1">Ultima carta!</span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 rounded-[2rem] bg-ink-900 ring-1 ring-white/5">
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              if (!myTurn || s.drew) return;
              buzz(8);
              update((x) => draw(x, me, nm));
            }}
            disabled={!myTurn || s.drew}
            className="flex flex-col items-center gap-1 disabled:opacity-60"
            aria-label="Pesca una carta"
          >
            <UCardView card={null} w={w * 1.1} />
            <span className="flex items-center gap-1 text-xs text-ink-400">
              <Layers className="h-3.5 w-3.5" /> {myTurn && !s.drew ? 'Pesca' : `${s.deck.length}`}
            </span>
          </button>
          <div className="flex flex-col items-center gap-1">
            <div key={t.id} className="anim-pop">
              <UCardView card={t} w={w * 1.3} />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-ink-300">
              Colore <span className="h-3 w-3 rounded-full" style={{ background: COLOR_HEX[s.color] }} />{' '}
              {COLOR_NAME[s.color]}
            </span>
          </div>
        </div>
        {s.log && <p className="px-4 text-center text-xs text-ink-400">{s.log}</p>}
      </div>

      <div className="flex min-h-[2.5rem] items-center justify-between gap-2">
        <p className="text-sm text-ink-300">
          {s.result !== null
            ? ''
            : myTurn
              ? s.drew
                ? 'Gioca una carta o passa'
                : 'Tocca a te'
              : `Turno di ${nm[s.turn]}…`}
        </p>
        <div className="flex gap-2">
          {myTurn && hand.length === 2 && (
            <button
              className={`btn py-2 ${s.called[me] ? 'bg-emerald-500/20 text-emerald-300' : 'bg-p1 text-ink-950'}`}
              onClick={() => {
                buzz([20, 30, 20]);
                update((x) => callLast(x, me));
              }}
              disabled={s.called[me]}
            >
              <Hand className="h-4 w-4" /> {s.called[me] ? 'Detto!' : 'Ultima!'}
            </button>
          )}
          {myTurn && s.drew && (
            <button className="btn-ghost py-2" onClick={() => update((x) => pass(x, me, nm))}>
              Passa
            </button>
          )}
        </div>
      </div>

      {/* la mano: va a capo e, se le carte sono tante, scorre */}
      <div className="flex max-h-[42%] flex-wrap justify-center gap-1.5 overflow-y-auto pb-1 pt-1">
        {hand.map((c) => {
          const ok = myTurn && playable(s, c);
          return <UCardView key={c.id} card={c} w={w} onClick={() => tap(c)} disabled={!ok} dim={myTurn && !ok} />;
        })}
      </div>

      {picking !== null && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/70"
          onClick={() => setPicking(null)}
        >
          <div className="anim-pop rounded-3xl bg-ink-800 p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-semibold">Scegli il colore</p>
            <div className="grid grid-cols-2 gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="h-16 w-24 rounded-2xl font-semibold capitalize text-white active:scale-95"
                  style={{ background: COLOR_HEX[c] }}
                  onClick={() => {
                    const id = picking;
                    setPicking(null);
                    buzz(10);
                    update((x) => playCard(x, me, id, c, nm));
                  }}
                >
                  {COLOR_NAME[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
