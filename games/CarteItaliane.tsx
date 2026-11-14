import { useEffect } from 'react';
import Loading from '../components/Loading';
import {
  CardView,
  cardName,
  newDeck,
  sameCard,
  SUIT_NAME,
  SUITS,
  SuitIcon,
  type Card,
  type Suit,
} from '../components/ItalianCard';
import { PassScreen, usePrivateView } from '../components/PassScreen';
import { buzz, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useFit } from '../lib/useFit';
import { useReport, useShared } from '../online/shared';
import type { GameProps } from './types';

/*
 * Motore comune per i giochi a prese con il mazzo italiano da 40 carte, in due giocatori.
 * Briscola: 3 carte in mano, briscola scoperta, nessun obbligo di rispondere al seme, 120 punti.
 * Tressette: 10 carte in mano, niente briscola, obbligo di rispondere al seme, carte pescate mostrate,
 *            si gioca a più mani fino a 21 punti.
 */

interface Rules {
  id: 'briscola' | 'tressette';
  handSize: number;
  trump: boolean;
  mustFollow: boolean;
  /** forza di presa: indice più alto = carta più forte */
  strength: number[];
  /** punti per valore (in terzi per il tressette) */
  points: Record<number, number>;
  /** punti per l'ultima presa (stessa unità di points) */
  lastTrick: number;
  /** quante unità fanno un punto (3 = terzi) */
  unit: number;
  /** punti per vincere la partita (0 = una sola mano) */
  target: number;
  showDrawn: boolean;
}

const BRISCOLA: Rules = {
  id: 'briscola',
  handSize: 3,
  trump: true,
  mustFollow: false,
  strength: [2, 4, 5, 6, 7, 8, 9, 10, 3, 1],
  points: { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 },
  lastTrick: 0,
  unit: 1,
  target: 0,
  showDrawn: false,
};

const TRESSETTE: Rules = {
  id: 'tressette',
  handSize: 10,
  trump: false,
  mustFollow: true,
  strength: [4, 5, 6, 7, 8, 9, 10, 1, 2, 3],
  points: { 1: 3, 2: 1, 3: 1, 8: 1, 9: 1, 10: 1 },
  lastTrick: 3,
  unit: 3,
  target: 21,
  showDrawn: true,
};

type Played = { side: Side; card: Card };

interface State {
  deck: Card[]; // si pesca dalla fine; nella briscola deck[0] è la briscola scoperta
  trumpSuit: Suit | null;
  trumpCard: Card | null;
  hands: [Card[], Card[]];
  table: Played[];
  taken: [Card[], Card[]];
  turn: Side;
  resolving: boolean;
  lastTrick: { cards: Played[]; winner: Side } | null;
  drawn: [Card | null, Card | null] | null;
  handNo: number;
  firstLeader: Side;
  /** punti della partita (tressette, più mani) */
  match: [number, number];
  handPoints: [number, number] | null; // riepilogo a fine mano, in attesa della mano successiva
  result: Result | null;
}

function deal(rules: Rules, leader: Side, handNo: number, match: [number, number]): State {
  const deck = newDeck();
  const hands: [Card[], Card[]] = [[], []];
  for (let i = 0; i < rules.handSize; i++) {
    hands[leader].push(deck.pop()!);
    hands[other(leader)].push(deck.pop()!);
  }
  const trumpCard = rules.trump ? deck[0] : null;
  return {
    deck,
    trumpSuit: trumpCard?.s ?? null,
    trumpCard,
    hands,
    table: [],
    taken: [[], []],
    turn: leader,
    resolving: false,
    lastTrick: null,
    drawn: null,
    handNo,
    firstLeader: leader,
    match,
    handPoints: null,
    result: null,
  };
}

const rank = (rules: Rules, c: Card) => rules.strength.indexOf(c.v);

function trickWinner(rules: Rules, table: Played[], trump: Suit | null): Side {
  const [a, b] = table;
  if (trump !== null && b.card.s === trump && a.card.s !== trump) return b.side;
  if (b.card.s === a.card.s && rank(rules, b.card) > rank(rules, a.card)) return b.side;
  return a.side;
}

function legal(rules: Rules, st: State, side: Side, c: Card) {
  if (!rules.mustFollow || st.table.length === 0) return true;
  const lead = st.table[0].card.s;
  return c.s === lead || !st.hands[side].some((h) => h.s === lead);
}

const rawPoints = (rules: Rules, cards: Card[]) => cards.reduce((t, c) => t + (rules.points[c.v] ?? 0), 0);

function play(rules: Rules, st: State, side: Side, c: Card): State {
  if (st.result !== null || st.handPoints || st.resolving || st.turn !== side) return st;
  if (!st.hands[side].some((h) => sameCard(h, c)) || !legal(rules, st, side, c)) return st;
  const hands = [...st.hands] as [Card[], Card[]];
  hands[side] = hands[side].filter((h) => !sameCard(h, c));
  const table = [...st.table, { side, card: c }];
  if (table.length < 2) return { ...st, hands, table, turn: other(side) };
  return { ...st, hands, table, resolving: true };
}

function resolve(rules: Rules, st: State): State {
  if (!st.resolving || st.table.length < 2) return st;
  const winner = trickWinner(rules, st.table, st.trumpSuit);
  const taken = [...st.taken] as [Card[], Card[]];
  taken[winner] = [...taken[winner], ...st.table.map((p) => p.card)];
  const deck = [...st.deck];
  const hands = [[...st.hands[0]], [...st.hands[1]]] as [Card[], Card[]];
  let drawn: [Card | null, Card | null] | null = null;
  if (deck.length >= 2) {
    drawn = [null, null];
    const a = deck.pop()!;
    const b = deck.pop()!;
    hands[winner].push(a);
    hands[other(winner)].push(b);
    drawn[winner] = a;
    drawn[other(winner)] = b;
  }
  const next: State = {
    ...st,
    deck,
    hands,
    taken,
    table: [],
    resolving: false,
    turn: winner,
    lastTrick: { cards: st.table, winner },
    drawn,
  };
  if (hands[0].length > 0 || hands[1].length > 0) return next;

  // fine mano
  const raw: [number, number] = [rawPoints(rules, taken[0]), rawPoints(rules, taken[1])];
  raw[winner] += rules.lastTrick;
  const pts: [number, number] = [Math.floor(raw[0] / rules.unit), Math.floor(raw[1] / rules.unit)];
  if (!rules.target) {
    return { ...next, handPoints: pts, result: pts[0] === pts[1] ? 'draw' : pts[0] > pts[1] ? 0 : 1 };
  }
  const match: [number, number] = [st.match[0] + pts[0], st.match[1] + pts[1]];
  const done = Math.max(...match) >= rules.target && match[0] !== match[1];
  return { ...next, match, handPoints: pts, result: done ? (match[0] > match[1] ? 0 : 1) : null };
}

function nextHand(rules: Rules, st: State): State {
  if (!st.handPoints || st.result !== null) return st;
  return deal(rules, other(st.firstLeader), st.handNo + 1, st.match);
}

function TrickGame({ rules, starter, names, onTurn, onEnd }: GameProps & { rules: Rules }) {
  const fit = useFit(1);
  const [s, update] = useShared<State>(() => deal(rules, starter, 1, [0, 0]));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const active: Side | null = !s || s.resolving || s.handPoints ? null : s.turn;
  const view = usePrivateView(active);

  const resolving = s?.resolving ?? false;
  useEffect(() => {
    if (!resolving) return;
    const t = window.setTimeout(() => update((x) => resolve(rules, x)), 1400);
    return () => window.clearTimeout(t);
  }, [resolving, update, rules]);

  const name = (x: Side) => playerName(names, x);

  if (!s) return <Loading />;

  if (view.covered && active !== null) {
    const lt = s.lastTrick;
    let note: string | undefined;
    if (lt) {
      note = `${name(lt.winner)} ha preso: ${lt.cards.map((p) => cardName(p.card)).join(' + ')}`;
      if (rules.showDrawn && s.drawn) {
        note += `. Pescate: ${name(0)} ${cardName(s.drawn[0]!)}, ${name(1)} ${cardName(s.drawn[1]!)}`;
      }
    } else if (s.table.length === 1) {
      note = `${name(s.table[0].side)} ha giocato ${cardName(s.table[0].card)}`;
    }
    return <PassScreen who={active} names={names} note={note} onReady={view.reveal} />;
  }

  const me = view.viewer;
  const opp = other(me);
  const myTurn =
    !s.resolving && !s.handPoints && s.result === null && s.turn === me && (view.online ? true : active === me);
  // sullo stesso telefono, mentre si risolve la presa, le mani restano coperte
  const showMyHand = view.online || active === me;

  const handW = Math.max(30, Math.min(70, fit.cw / 5.2));
  const n = s.hands[me].length;
  const overlap = n > 1 ? Math.max(0, (n * handW - (fit.cw - 8)) / (n - 1)) : 0;
  const tableW = Math.min(84, fit.cw / 4.2);

  let status: React.ReactNode;
  if (s.handPoints) {
    status = null;
  } else if (s.resolving) {
    const w = trickWinner(rules, s.table, s.trumpSuit);
    status = (
      <>
        Prende <b className={PC.text[w]}>{name(w)}</b>
      </>
    );
  } else if (myTurn) {
    status =
      s.table.length === 0
        ? 'Tocca a te: gioca una carta'
        : rules.mustFollow
          ? 'Rispondi (se puoi, allo stesso seme)'
          : 'Tocca a te: rispondi';
  } else {
    status = <>Turno di {name(s.turn)}…</>;
  }

  const pointsLabel = (x: Side) => (rules.target ? `${s.match[x]} punti` : `${s.taken[x].length} carte prese`);

  return (
    <div ref={fit.ref} className="relative flex h-full w-full flex-col justify-between gap-2">
      {/* avversario */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${PC.text[opp]}`}>{name(opp)}</p>
          <p className="text-xs text-ink-400">{pointsLabel(opp)}</p>
        </div>
        <div className="flex">
          {s.hands[opp].map((_, i) => (
            <CardView key={i} back w={Math.min(34, handW * 0.5)} className={i ? '-ml-4' : ''} />
          ))}
        </div>
      </div>

      {/* tavolo */}
      <div className="relative flex flex-1 items-center justify-center gap-6 rounded-[2rem] bg-emerald-950/50 ring-1 ring-emerald-400/10">
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {s.deck.length > 0 && (
            <div className="flex items-center gap-1.5">
              <CardView back w={tableW * 0.6} />
              {s.trumpCard && <CardView card={s.trumpCard} w={tableW * 0.6} className="ring-2 ring-amber-400" />}
            </div>
          )}
          <span className="text-xs text-ink-400">{s.deck.length ? `${s.deck.length} nel mazzo` : 'Mazzo finito'}</span>
        </div>
        {s.trumpSuit && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-xs text-ink-200">
            Briscola <SuitIcon s={s.trumpSuit} size={16} /> {SUIT_NAME[s.trumpSuit]}
          </div>
        )}
        {rules.showDrawn && s.drawn && !s.resolving && s.table.length === 0 && (
          <div className="absolute bottom-3 left-3 right-3 text-center text-[11px] leading-snug text-ink-400">
            Pescate: {name(0)} {cardName(s.drawn[0]!)} · {name(1)} {cardName(s.drawn[1]!)}
          </div>
        )}
        {s.table.map((p) => (
          <div key={`${p.card.s}${p.card.v}`} className="anim-pop flex flex-col items-center gap-1">
            <CardView card={p.card} w={tableW} />
            <span className={`text-[11px] font-semibold ${PC.text[p.side]}`}>{name(p.side)}</span>
          </div>
        ))}

        {s.handPoints && (
          <div className="anim-fade-up absolute inset-4 flex flex-col items-center justify-center gap-3 rounded-3xl bg-ink-900/95 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
              {rules.target ? `Fine mano ${s.handNo}` : 'Fine partita'}
            </p>
            <div className="flex items-end gap-6">
              {([0, 1] as Side[]).map((x) => (
                <div key={x}>
                  <p className={`text-sm font-semibold ${PC.text[x]}`}>{name(x)}</p>
                  <p className="font-display text-4xl font-extrabold tabular-nums">{s.handPoints![x]}</p>
                  {rules.target > 0 && <p className="text-xs text-ink-400">totale {s.match[x]}</p>}
                </div>
              ))}
            </div>
            {rules.target > 0 && s.result === null && (
              <>
                <p className="text-xs text-ink-400">Si vince a {rules.target} punti</p>
                <button className="btn-primary" onClick={() => update((x) => nextHand(rules, x))}>
                  Mano successiva
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="min-h-[1.25rem] text-center text-sm text-ink-300">{status}</p>

      {/* la mia mano */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${PC.text[me]}`}>{name(me)}</p>
          <p className="text-xs text-ink-400">{pointsLabel(me)}</p>
        </div>
      </div>
      <div className="flex justify-center pb-1 pt-3">
        {[...s.hands[me]]
          .sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || rank(rules, b) - rank(rules, a))
          .map((c, i) => {
            const ok = myTurn && legal(rules, s, me, c);
            return (
              <div key={`${c.s}${c.v}`} style={{ marginLeft: i ? -overlap : 0 }}>
                <CardView
                  card={showMyHand ? c : null}
                  back={!showMyHand}
                  w={handW}
                  dim={myTurn && !ok}
                  disabled={!ok}
                  onClick={
                    showMyHand
                      ? () => {
                          if (!ok) return;
                          buzz(10);
                          update((x) => play(rules, x, me, c));
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function Briscola(props: GameProps) {
  return <TrickGame {...props} rules={BRISCOLA} />;
}

export function Tressette(props: GameProps) {
  return <TrickGame {...props} rules={TRESSETTE} />;
}
