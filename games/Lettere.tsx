import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, RotateCcw, Shuffle, X } from 'lucide-react';
import Loading from '../components/Loading';
import { PassScreen, usePrivateView } from '../components/PassScreen';
import { buzz, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useFit } from '../lib/useFit';
import { useReport, useShared } from '../online/shared';
import type { GameProps } from './types';

/*
 * Lettere: componi parole incrociate su una griglia 13×13 con le lettere del tuo leggio.
 * Non c'è un dizionario: l'avversario accetta o contesta le parole (se le contesta, perdi il turno).
 */

const N = 13;
const CENTER = 6 * N + 6;
const RACK = 7;
const BINGO = 30;

type Bonus = 'DL' | 'TL' | 'DP' | 'TP' | 'C';
const BONUS: Record<number, Bonus> = (() => {
  const m: Record<number, Bonus> = {};
  const put = (b: Bonus, cells: [number, number][]) => {
    for (const [r, c] of cells) {
      for (const [rr, cc] of [
        [r, c],
        [c, r],
        [N - 1 - r, c],
        [c, N - 1 - r],
        [r, N - 1 - c],
        [N - 1 - c, r],
        [N - 1 - r, N - 1 - c],
        [N - 1 - c, N - 1 - r],
      ])
        m[rr * N + cc] = b;
    }
  };
  put('DL', [
    [0, 0],
    [1, 1],
    [3, 6],
    [0, 6],
  ]);
  put('TP', [[0, 3]]);
  put('DP', [
    [2, 2],
    [4, 4],
  ]);
  put('TL', [
    [1, 5],
    [5, 5],
  ]);
  m[CENTER] = 'C';
  return m;
})();
const BONUS_STYLE: Record<Bonus, { bg: string; label: string }> = {
  DL: { bg: 'bg-sky-500/35', label: '2L' },
  TL: { bg: 'bg-blue-600/60', label: '3L' },
  DP: { bg: 'bg-rose-400/35', label: '2P' },
  TP: { bg: 'bg-rose-600/60', label: '3P' },
  C: { bg: 'bg-rose-400/35', label: '★' },
};

// distribuzione e valori pensati per l'italiano (94 tessere, 2 jolly)
const LETTERS: [string, number, number][] = [
  ['A', 10, 1], ['E', 10, 1], ['I', 10, 1], ['O', 9, 1], ['U', 3, 4],
  ['C', 5, 2], ['R', 5, 1], ['S', 5, 1], ['T', 5, 1], ['N', 5, 1], ['L', 4, 2], ['M', 3, 2],
  ['P', 3, 3], ['D', 3, 3], ['G', 2, 4], ['B', 2, 4], ['F', 2, 4], ['V', 2, 4], ['Z', 2, 8],
  ['H', 1, 8], ['Q', 1, 10], ['', 2, 0],
]; // prettier-ignore
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Tile {
  id: number;
  l: string; // '' = jolly
  p: number;
  as?: string; // lettera scelta per il jolly
}
const letterOf = (t: Tile) => t.as ?? t.l;

interface Word {
  w: string;
  pts: number;
}
interface Proposal {
  side: Side;
  placed: { i: number; t: Tile }[];
  words: Word[];
  total: number;
}
interface State {
  board: (Tile | null)[];
  racks: [Tile[], Tile[]];
  bag: Tile[];
  scores: [number, number];
  turn: Side;
  pending: Proposal | null;
  scoreless: number;
  log: string;
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

function init(starter: Side): State {
  let id = 0;
  const all: Tile[] = [];
  for (const [l, n, p] of LETTERS) for (let k = 0; k < n; k++) all.push({ id: id++, l, p });
  const bag = shuffle(all);
  const racks: [Tile[], Tile[]] = [bag.splice(0, RACK), bag.splice(0, RACK)];
  return {
    board: Array(N * N).fill(null),
    racks,
    bag,
    scores: [0, 0],
    turn: starter,
    pending: null,
    scoreless: 0,
    log: '',
    result: null,
  };
}

// ───────────── Validazione e punteggio di una giocata ─────────────

type Placement = Map<number, Tile>;

function analyse(
  board: (Tile | null)[],
  placed: Placement,
): { ok: true; words: Word[]; total: number } | { ok: false; why: string } {
  const cells = [...placed.keys()];
  if (cells.length === 0) return { ok: false, why: 'Metti almeno una lettera' };
  const rows = new Set(cells.map((i) => Math.floor(i / N)));
  const cols = new Set(cells.map((i) => i % N));
  if (rows.size > 1 && cols.size > 1) return { ok: false, why: 'Le lettere vanno su una sola riga o colonna' };
  const empty = board.every((t) => t === null);
  if (empty && !placed.has(CENTER)) return { ok: false, why: 'La prima parola deve passare dalla stella ★' };
  if (empty && cells.length < 2) return { ok: false, why: 'La prima parola ha almeno 2 lettere' };

  const at = (r: number, c: number) =>
    r < 0 || c < 0 || r >= N || c >= N ? null : (placed.get(r * N + c) ?? board[r * N + c]);
  const horizontal =
    rows.size === 1 &&
    Boolean(
      cols.size > 1 ||
      at(Math.floor(cells[0] / N), (cells[0] % N) - 1) ||
      at(Math.floor(cells[0] / N), (cells[0] % N) + 1),
    );

  // continuità sulla linea
  const line = cells.map((i) => (horizontal ? i % N : Math.floor(i / N)));
  const fixed = horizontal ? Math.floor(cells[0] / N) : cells[0] % N;
  for (let k = Math.min(...line); k <= Math.max(...line); k++) {
    if (!(horizontal ? at(fixed, k) : at(k, fixed)))
      return { ok: false, why: 'Le lettere devono essere attaccate, senza buchi' };
  }

  const wordAt = (r: number, c: number, dr: number, dc: number): Word | null => {
    while (at(r - dr, c - dc)) {
      r -= dr;
      c -= dc;
    }
    let w = '';
    let sum = 0;
    let mult = 1;
    let len = 0;
    while (at(r, c)) {
      const i = r * N + c;
      const t = at(r, c)!;
      let lp = t.p;
      if (placed.has(i)) {
        const b = BONUS[i];
        if (b === 'DL') lp *= 2;
        if (b === 'TL') lp *= 3;
        if (b === 'DP' || b === 'C') mult *= 2;
        if (b === 'TP') mult *= 3;
      }
      w += letterOf(t);
      sum += lp;
      len++;
      r += dr;
      c += dc;
    }
    return len >= 2 ? { w, pts: sum * mult } : null;
  };

  const words: Word[] = [];
  const [r0, c0] = [Math.floor(cells[0] / N), cells[0] % N];
  const main = horizontal ? wordAt(r0, c0, 0, 1) : wordAt(r0, c0, 1, 0);
  if (main) words.push(main);
  for (const i of cells) {
    const [r, c] = [Math.floor(i / N), i % N];
    const cross = horizontal ? wordAt(r, c, 1, 0) : wordAt(r, c, 0, 1);
    if (cross) words.push(cross);
  }
  if (words.length === 0) return { ok: false, why: 'Forma una parola di almeno 2 lettere' };
  if (!empty) {
    const touches = cells.some((i) => {
      const [r, c] = [Math.floor(i / N), i % N];
      return [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].some(([rr, cc]) => rr >= 0 && cc >= 0 && rr < N && cc < N && board[rr * N + cc]);
    });
    if (!touches) return { ok: false, why: 'La parola deve incrociare o toccare quelle già sulla griglia' };
  }
  let total = words.reduce((t, w) => t + w.pts, 0);
  if (cells.length === RACK) total += BINGO;
  return { ok: true, words, total };
}

const rackSum = (r: Tile[]) => r.reduce((t, x) => t + x.p, 0);

function finish(st: State, out: Side | null): State {
  const scores = [...st.scores] as [number, number];
  const left: [number, number] = [rackSum(st.racks[0]), rackSum(st.racks[1])];
  scores[0] -= left[0];
  scores[1] -= left[1];
  if (out !== null) scores[out] += left[other(out)];
  return { ...st, scores, result: scores[0] === scores[1] ? 'draw' : scores[0] > scores[1] ? 0 : 1 };
}

function propose(st: State, side: Side, placed: { i: number; t: Tile }[], names: [string, string]): State {
  if (st.result !== null || st.pending || st.turn !== side) return st;
  const map: Placement = new Map(placed.map((p) => [p.i, p.t]));
  if (placed.some((p) => st.board[p.i] || !st.racks[side].some((t) => t.id === p.t.id))) return st;
  const a = analyse(st.board, map);
  if (!a.ok) return st;
  return {
    ...st,
    pending: { side, placed, words: a.words, total: a.total },
    turn: other(side),
    log: `${names[side]} propone ${a.words.map((w) => w.w).join(', ')} (${a.total} punti)`,
  };
}

function judge(st: State, side: Side, accept: boolean, names: [string, string]): State {
  const p = st.pending;
  if (!p || st.result !== null || other(p.side) !== side) return st;
  if (!accept) {
    const next = {
      ...st,
      pending: null,
      scoreless: st.scoreless + 1,
      log: `${names[side]} ha contestato ${p.words.map((w) => w.w).join(', ')}: ${names[p.side]} perde il turno`,
    };
    return next.scoreless >= 4 ? finish(next, null) : next;
  }
  const board = [...st.board];
  for (const { i, t } of p.placed) board[i] = t;
  const used = new Set(p.placed.map((x) => x.t.id));
  const bag = [...st.bag];
  const rack = st.racks[p.side].filter((t) => !used.has(t.id));
  while (rack.length < RACK && bag.length) rack.push(bag.pop()!);
  const racks = [...st.racks] as [Tile[], Tile[]];
  racks[p.side] = rack;
  const scores = [...st.scores] as [number, number];
  scores[p.side] += p.total;
  const next: State = {
    ...st,
    board,
    bag,
    racks,
    scores,
    pending: null,
    scoreless: 0,
    log: `${names[p.side]}: ${p.words.map((w) => w.w).join(', ')} +${p.total}`,
  };
  return rack.length === 0 && bag.length === 0 ? finish(next, p.side) : next;
}

function exchange(st: State, side: Side, ids: number[], names: [string, string]): State {
  if (st.result !== null || st.pending || st.turn !== side || ids.length === 0 || st.bag.length < RACK) return st;
  const out = st.racks[side].filter((t) => ids.includes(t.id)).map((t) => ({ ...t, as: undefined }));
  const keep = st.racks[side].filter((t) => !ids.includes(t.id));
  const bag = [...st.bag];
  const drawn = bag.splice(bag.length - out.length, out.length);
  const racks = [...st.racks] as [Tile[], Tile[]];
  racks[side] = [...keep, ...drawn];
  const next = {
    ...st,
    racks,
    bag: shuffle([...bag, ...out]),
    turn: other(side),
    scoreless: st.scoreless + 1,
    log: `${names[side]} ha cambiato ${out.length} ${out.length === 1 ? 'lettera' : 'lettere'}`,
  };
  return next.scoreless >= 4 ? finish(next, null) : next;
}

function passTurn(st: State, side: Side, names: [string, string]): State {
  if (st.result !== null || st.pending || st.turn !== side) return st;
  const next = { ...st, turn: other(side), scoreless: st.scoreless + 1, log: `${names[side]} ha passato` };
  return next.scoreless >= 4 ? finish(next, null) : next;
}

// ───────────── Interfaccia ─────────────

function TileView({ t, size, fresh, faded }: { t: Tile; size: number; fresh?: boolean; faded?: boolean }) {
  return (
    <span
      className={`relative flex h-full w-full items-center justify-center rounded-[18%] font-display font-extrabold leading-none text-ink-900 shadow-[inset_0_-2px_0_rgba(0,0,0,.18)] ${
        fresh ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-[#f3e6c4]'
      } ${faded ? 'opacity-70' : ''}`}
      style={{ fontSize: size * 0.55 }}
    >
      <span className={t.l === '' ? 'text-rose-600' : ''}>{letterOf(t) || ' '}</span>
      {t.p > 0 && (
        <span
          className="absolute bottom-[6%] right-[10%] font-sans font-bold"
          style={{ fontSize: Math.max(7, size * 0.24) }}
        >
          {t.p}
        </span>
      )}
    </span>
  );
}

export default function Lettere({ starter, names, onTurn, onEnd }: GameProps) {
  const fit = useFit(1);
  const nm: [string, string] = [playerName(names, 0), playerName(names, 1)];
  const [s, update] = useShared<State>(() => init(starter));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const view = usePrivateView(s && s.result === null ? s.turn : null);

  // giocata in preparazione (solo su questo telefono finché non la proponi)
  const [placed, setPlaced] = useState<{ i: number; t: Tile }[]>([]);
  const [sel, setSel] = useState<number | null>(null); // id tessera selezionata nel leggio
  const [order, setOrder] = useState<number[] | null>(null); // ordine del leggio dopo "mescola"
  const [swap, setSwap] = useState<number[] | null>(null); // modalità cambio lettere
  const [blankFor, setBlankFor] = useState<{ i: number; t: Tile } | null>(null);

  const placedMap = useMemo(() => new Map(placed.map((p) => [p.i, p.t])), [placed]);
  const analysis = useMemo(() => (s ? analyse(s.board, placedMap) : null), [s, placedMap]);

  if (!s) return <Loading />;
  if (view.covered && s.result === null) {
    return <PassScreen who={s.turn} names={names} note={s.log || undefined} onReady={view.reveal} />;
  }

  const me = view.viewer;
  const opp = other(me);
  const myTurn = s.result === null && s.turn === me;
  const judging = myTurn && s.pending !== null && s.pending.side === opp;
  const canPlay = myTurn && !s.pending;

  const usedIds = new Set(placed.map((p) => p.t.id));
  let rack = s.racks[me].filter((t) => !usedIds.has(t.id));
  if (order) rack = [...rack].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const pendingCells = new Map((s.pending?.placed ?? []).map((p) => [p.i, p.t]));
  const boardPx = Math.floor(Math.min(fit.cw, fit.ch - 190));
  const cell = boardPx / N;
  const rackTile = Math.min(46, (fit.cw - 6 * 6) / RACK);

  function tapCell(i: number) {
    if (!canPlay) return;
    const mine = placed.find((p) => p.i === i);
    if (mine) {
      setPlaced(placed.filter((p) => p.i !== i));
      return;
    }
    if (s!.board[i] || sel === null) return;
    const t = s!.racks[me].find((x) => x.id === sel);
    if (!t) return;
    buzz(6);
    if (t.l === '') {
      setBlankFor({ i, t });
      return;
    }
    setPlaced([...placed, { i, t }]);
    setSel(null);
  }

  function reset() {
    setPlaced([]);
    setSel(null);
    setSwap(null);
  }

  return (
    <div ref={fit.ref} className="relative flex h-full w-full flex-col items-center gap-2">
      {/* punteggi */}
      <div className="flex w-full items-center justify-between text-sm" style={{ maxWidth: boardPx }}>
        {([0, 1] as Side[]).map((x) => (
          <span key={x} className={`font-semibold ${PC.text[x]} ${x === 1 ? 'order-3' : ''}`}>
            {nm[x]} <span className="font-display text-lg font-extrabold tabular-nums text-ink-50">{s.scores[x]}</span>
          </span>
        ))}
        <span className="order-2 text-xs text-ink-400">{s.bag.length} nel sacchetto</span>
      </div>

      {/* griglia */}
      <div
        className="grid gap-px rounded-xl bg-ink-700 p-px"
        style={{ width: boardPx, height: boardPx, gridTemplateColumns: `repeat(${N}, 1fr)` }}
      >
        {s.board.map((t, i) => {
          const mine = placedMap.get(i);
          const pend = pendingCells.get(i);
          const b = BONUS[i];
          return (
            <button
              key={i}
              onClick={() => tapCell(i)}
              className={`relative flex items-center justify-center rounded-[3px] ${b ? BONUS_STYLE[b].bg : 'bg-ink-900'}`}
              aria-label={`Casella ${Math.floor(i / N) + 1}, ${(i % N) + 1}`}
            >
              {t ? (
                <TileView t={t} size={cell} />
              ) : mine ? (
                <TileView t={mine} size={cell} fresh />
              ) : pend ? (
                <TileView t={pend} size={cell} fresh faded />
              ) : b ? (
                <span className="font-bold text-white/70" style={{ fontSize: cell * 0.36 }}>
                  {BONUS_STYLE[b].label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* stato / approvazione */}
      <div
        className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 text-center text-sm"
        style={{ maxWidth: boardPx }}
      >
        {s.result !== null ? (
          <span className="text-ink-400">Partita finita (le lettere rimaste sono state sottratte)</span>
        ) : judging ? (
          <>
            <span className="min-w-0 flex-1 text-left text-ink-200">
              <b className={PC.text[opp]}>{nm[opp]}</b> propone{' '}
              <b>{s.pending!.words.map((w) => `${w.w} (${w.pts})`).join(', ')}</b> = {s.pending!.total} punti. Valide?
            </span>
            <button
              className="btn bg-p1-deep px-3 py-2 text-white"
              onClick={() => update((x) => judge(x, me, false, nm))}
            >
              <X className="h-4 w-4" /> No
            </button>
            <button className="btn-primary px-3 py-2" onClick={() => update((x) => judge(x, me, true, nm))}>
              <Check className="h-4 w-4" /> Sì
            </button>
          </>
        ) : s.pending ? (
          <span className="text-ink-300">In attesa che {nm[other(s.pending.side)]} controlli le parole…</span>
        ) : !myTurn ? (
          <span className="text-ink-400">Turno di {nm[s.turn]}…</span>
        ) : swap ? (
          <span className="text-ink-300">Tocca le lettere da cambiare ({swap.length})</span>
        ) : placed.length === 0 ? (
          <span className="text-ink-400">{s.log ? `${s.log}. ` : ''}Tocca una lettera, poi una casella</span>
        ) : analysis?.ok ? (
          <span className="text-ink-200">
            {analysis.words.map((w) => w.w).join(', ')} → <b>{analysis.total} punti</b>
            {placed.length === RACK && ` (+${BINGO} bonus)`}
          </span>
        ) : (
          <span className="text-amber-300">{analysis && !analysis.ok ? analysis.why : ''}</span>
        )}
      </div>

      {/* leggio */}
      <div className="flex gap-1.5">
        {rack.map((t) => {
          const chosen = swap ? swap.includes(t.id) : sel === t.id;
          return (
            <button
              key={t.id}
              disabled={!canPlay}
              onClick={() => {
                buzz(5);
                if (swap) setSwap(swap.includes(t.id) ? swap.filter((x) => x !== t.id) : [...swap, t.id]);
                else setSel(sel === t.id ? null : t.id);
              }}
              className={`transition ${chosen ? '-translate-y-2' : ''}`}
              style={{ width: rackTile, height: rackTile }}
              aria-label={t.l ? `Lettera ${t.l}` : 'Jolly'}
            >
              <span className={`block h-full w-full rounded-[18%] ${chosen ? 'ring-4 ring-white' : ''}`}>
                <TileView t={t} size={rackTile} />
              </span>
            </button>
          );
        })}
      </div>

      {/* azioni */}
      {canPlay && (
        <div className="flex flex-wrap justify-center gap-2">
          {swap ? (
            <>
              <button className="btn-ghost py-2" onClick={() => setSwap(null)}>
                Annulla
              </button>
              <button
                className="btn-primary py-2"
                disabled={swap.length === 0}
                onClick={() => {
                  const ids = swap;
                  reset();
                  update((x) => exchange(x, me, ids, nm));
                }}
              >
                Cambia {swap.length}
              </button>
            </>
          ) : (
            <>
              {placed.length > 0 ? (
                <button className="btn-ghost px-3 py-2" onClick={reset} aria-label="Ritira le lettere">
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className="btn-ghost px-3 py-2"
                  onClick={() => setOrder(shuffle(s.racks[me].map((t) => t.id)))}
                  aria-label="Mescola il leggio"
                >
                  <Shuffle className="h-4 w-4" />
                </button>
              )}
              <button
                className="btn-ghost px-3 py-2"
                disabled={s.bag.length < RACK || placed.length > 0}
                onClick={() => setSwap([])}
              >
                <ArrowLeftRight className="h-4 w-4" /> Cambia
              </button>
              <button
                className="btn-ghost px-3 py-2"
                disabled={placed.length > 0}
                onClick={() => update((x) => passTurn(x, me, nm))}
              >
                Passa
              </button>
              <button
                className="btn-primary px-4 py-2"
                disabled={!analysis?.ok}
                onClick={() => {
                  const p = placed;
                  reset();
                  buzz([10, 30, 10]);
                  update((x) => propose(x, me, p, nm));
                }}
              >
                Gioca{analysis?.ok ? ` · ${analysis.total}` : ''}
              </button>
            </>
          )}
        </div>
      )}

      {blankFor && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/70 p-4"
          onClick={() => setBlankFor(null)}
        >
          <div
            className="anim-pop w-full max-w-xs rounded-3xl bg-ink-800 p-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 font-semibold">Che lettera è il jolly?</p>
            <div className="grid grid-cols-6 gap-1.5">
              {ALPHABET.map((l) => (
                <button
                  key={l}
                  className="aspect-square rounded-lg bg-[#f3e6c4] font-display text-lg font-extrabold text-ink-900 active:scale-95"
                  onClick={() => {
                    setPlaced([...placed, { i: blankFor.i, t: { ...blankFor.t, as: l } }]);
                    setBlankFor(null);
                    setSel(null);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
