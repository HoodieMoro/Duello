import Loading from '../components/Loading';
import { Dices, Lock } from 'lucide-react';
import { buzz, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useShared } from '../online/shared';
import type { GameProps } from './types';

/*
 * Cinque dadi — il classico gioco a categorie, con un foglio punti a due colonne:
 * 3 lanci per turno, tocca i dadi per tenerli, poi scegli una casella del foglio.
 */

type Cat =
  | 'uno'
  | 'due'
  | 'tre'
  | 'quattro'
  | 'cinque'
  | 'sei'
  | 'tris'
  | 'poker'
  | 'full'
  | 'scalaCorta'
  | 'scalaLunga'
  | 'cinquina'
  | 'chance';

const UPPER: { id: Cat; label: string; face: number }[] = [
  { id: 'uno', label: 'Uno', face: 1 },
  { id: 'due', label: 'Due', face: 2 },
  { id: 'tre', label: 'Tre', face: 3 },
  { id: 'quattro', label: 'Quattro', face: 4 },
  { id: 'cinque', label: 'Cinque', face: 5 },
  { id: 'sei', label: 'Sei', face: 6 },
];
const LOWER: { id: Cat; label: string; hint: string }[] = [
  { id: 'tris', label: 'Tris', hint: '3 uguali · somma dadi' },
  { id: 'poker', label: 'Poker', hint: '4 uguali · somma dadi' },
  { id: 'full', label: 'Full', hint: '3 + 2 uguali · 25' },
  { id: 'scalaCorta', label: 'Scala corta', hint: '4 in fila · 30' },
  { id: 'scalaLunga', label: 'Scala lunga', hint: '5 in fila · 40' },
  { id: 'cinquina', label: 'Cinquina', hint: '5 uguali · 50' },
  { id: 'chance', label: 'Chance', hint: 'somma dadi' },
];
const ALL = [...UPPER.map((u) => u.id), ...LOWER.map((l) => l.id)];
const BONUS_AT = 63;
const BONUS = 35;
const EXTRA_CINQUINA = 100;

type Sheet = Partial<Record<Cat, number>>;

function counts(d: number[]) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  d.forEach((x) => c[x]++);
  return c;
}
const hasRun = (d: number[], len: number) => {
  const s = new Set(d);
  for (let start = 1; start + len - 1 <= 6; start++) {
    let ok = true;
    for (let k = 0; k < len; k++) if (!s.has(start + k)) ok = false;
    if (ok) return true;
  }
  return false;
};

/** joker: cinquina già segnata a 50 → full e scale valgono comunque */
function scoreFor(cat: Cat, d: number[], joker: boolean): number {
  const c = counts(d);
  const sum = d.reduce((a, b) => a + b, 0);
  const max = Math.max(...c);
  const up = UPPER.find((u) => u.id === cat);
  if (up) return c[up.face] * up.face;
  switch (cat) {
    case 'tris':
      return max >= 3 ? sum : 0;
    case 'poker':
      return max >= 4 ? sum : 0;
    case 'full':
      return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case 'scalaCorta':
      return joker || hasRun(d, 4) ? 30 : 0;
    case 'scalaLunga':
      return joker || hasRun(d, 5) ? 40 : 0;
    case 'cinquina':
      return max === 5 ? 50 : 0;
    case 'chance':
      return sum;
    default:
      return 0;
  }
}

function totalsOf(s: Sheet, extra: number) {
  const upper = UPPER.reduce((a, u) => a + (s[u.id] ?? 0), 0);
  const bonus = upper >= BONUS_AT ? BONUS : 0;
  const lower = LOWER.reduce((a, l) => a + (s[l.id] ?? 0), 0);
  return { upper, bonus, lower, extra, total: upper + bonus + lower + extra };
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({
  value,
  held,
  rolling,
  onClick,
  disabled,
}: {
  value: number;
  held: boolean;
  rolling: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  // senza onClick è solo un'icona (es. nel foglio punti)
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={onClick ? `Dado ${value}${held ? ', tenuto' : ''}` : undefined}
      aria-hidden={onClick ? undefined : true}
      className={`relative block aspect-square w-full rounded-[22%] p-[14%] transition duration-200 ${
        held ? '-translate-y-2 bg-amber-100 ring-4 ring-amber-400' : 'bg-ink-50'
      } ${rolling && !held ? 'animate-[die-roll_0.45s_ease-out]' : ''} shadow-[inset_0_-5px_0_rgba(0,0,0,.12),0_4px_10px_rgba(0,0,0,.35)]`}
    >
      <span className="grid h-full w-full grid-cols-3 grid-rows-3">
        {Array.from({ length: 9 }, (_, k) => (
          <span key={k} className="flex items-center justify-center">
            {PIPS[value]?.includes(k) && <span className="h-[70%] w-[70%] rounded-full bg-ink-900" />}
          </span>
        ))}
      </span>
      {held && (
        <Lock
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-400 p-1 text-ink-950"
          strokeWidth={3}
        />
      )}
    </Tag>
  );
}

interface State {
  sheets: [Sheet, Sheet];
  extra: [number, number];
  turn: Side;
  dice: number[];
  held: boolean[];
  /** lanci fatti nel turno (max 3) */
  rolls: number;
  rollId: number;
  lastPick: { side: Side; cat: Cat } | null;
  result: Result | null;
}

const isJoker = (st: State) =>
  st.rolls > 0 && st.dice.every((x) => x === st.dice[0]) && st.sheets[st.turn].cinquina === 50;

function pickCat(st: State, cat: Cat): State {
  const sheet = st.sheets[st.turn];
  if (st.result !== null || st.rolls === 0 || sheet[cat] !== undefined) return st;
  const joker = isJoker(st);
  const sheets = [...st.sheets] as [Sheet, Sheet];
  sheets[st.turn] = { ...sheet, [cat]: scoreFor(cat, st.dice, joker) };
  const extra = [...st.extra] as [number, number];
  if (joker) extra[st.turn] += EXTRA_CINQUINA;
  const base = { ...st, sheets, extra, lastPick: { side: st.turn, cat }, rolls: 0, held: Array(5).fill(false) };
  if (sheets.every((sh) => ALL.every((c) => sh[c] !== undefined))) {
    const t0 = totalsOf(sheets[0], extra[0]).total;
    const t1 = totalsOf(sheets[1], extra[1]).total;
    return { ...base, result: t0 === t1 ? 'draw' : t0 > t1 ? 0 : 1 };
  }
  return { ...base, turn: other(st.turn) };
}

export default function CinqueDadi({ starter, names, onTurn, onEnd }: GameProps) {
  const [s, update] = useShared<State>(() => ({
    sheets: [{}, {}],
    extra: [0, 0],
    turn: starter,
    dice: [1, 2, 3, 4, 5],
    held: Array(5).fill(false),
    rolls: 0,
    rollId: 0,
    lastPick: null,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);

  if (!s) return <Loading />;
  const { sheets, extra, turn, dice, held, rolls, rollId, lastPick } = s;
  const over = s.result !== null;
  const locked = over || !canAct;
  const joker = isJoker(s);
  const round = Math.min(13, Object.keys(sheets[starter]).length + 1);

  function roll() {
    if (rolls >= 3 || locked) return;
    buzz(15);
    update((st) =>
      st.rolls >= 3 || st.result !== null
        ? st
        : {
            ...st,
            dice: st.dice.map((x, i) => (st.held[i] ? x : 1 + Math.floor(Math.random() * 6))),
            rolls: st.rolls + 1,
            rollId: st.rollId + 1,
          },
    );
  }

  function toggle(i: number) {
    if (rolls === 0 || rolls >= 3 || locked) return;
    buzz(6);
    update((st) => (st.rolls === 0 || st.rolls >= 3 ? st : { ...st, held: st.held.map((x, k) => (k === i ? !x : x)) }));
  }

  function pick(cat: Cat) {
    if (locked) return;
    buzz([10, 30, 10]);
    update((st) => pickCat(st, cat));
  }

  const tot = [totalsOf(sheets[0], extra[0]), totalsOf(sheets[1], extra[1])];

  function Cell({ side, cat }: { side: Side; cat: Cat }) {
    const v = sheets[side][cat];
    const mine = side === turn && !locked;
    const fresh = lastPick?.side === side && lastPick.cat === cat;
    if (v !== undefined) {
      return (
        <td
          className={`px-2 py-1.5 text-center font-semibold tabular-nums ${fresh ? `${PC.text[side]} anim-pop` : 'text-ink-100'}`}
        >
          {v}
        </td>
      );
    }
    if (mine && rolls > 0) {
      const p = scoreFor(cat, dice, joker);
      return (
        <td className="p-0.5 text-center">
          <button
            onClick={() => pick(cat)}
            className={`w-full rounded-lg py-1 font-semibold tabular-nums transition hover:bg-white/15 active:scale-95 ${
              p > 0 ? `${PC.bgSoft[side]} ${PC.text[side]}` : 'bg-white/[0.04] text-ink-500'
            }`}
          >
            {p}
          </button>
        </td>
      );
    }
    return <td className={`px-2 py-1.5 text-center ${side === turn ? 'bg-white/[0.02]' : ''}`} />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <style>{`@keyframes die-roll{0%{transform:rotate(-25deg) scale(.8)}60%{transform:rotate(12deg) scale(1.05)}100%{transform:none}}`}</style>

      {/* Vassoio dei dadi */}
      <section className="rounded-3xl bg-emerald-950/50 p-3 ring-1 ring-emerald-400/10">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-400">
          <span>
            Turno <b className="text-ink-200">{round}</b>/13 ·{' '}
            <b className={PC.text[turn]}>{playerName(names, turn)}</b>
          </span>
          <span className="flex gap-1">
            {[0, 1, 2].map((k) => (
              <span key={k} className={`h-2 w-5 rounded-full ${k < 3 - rolls ? PC.bg[turn] : 'bg-white/10'}`} />
            ))}
          </span>
        </div>
        <div
          key={rollId}
          className={`grid grid-cols-5 gap-2.5 px-1 py-2 transition-opacity ${rolls === 0 && !over ? 'opacity-40' : ''}`}
        >
          {dice.map((v, i) => (
            <Die
              key={i}
              value={v}
              held={held[i]}
              rolling={rollId > 0}
              onClick={() => toggle(i)}
              disabled={rolls === 0 || rolls >= 3 || locked}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={roll} disabled={rolls >= 3 || locked} className="btn-primary flex-1">
            <Dices className="h-4 w-4" />
            {!canAct && !over
              ? `Turno di ${playerName(names, turn)}…`
              : rolls === 0
                ? 'Lancia i dadi'
                : rolls < 3
                  ? `Rilancia (${3 - rolls})`
                  : 'Scegli una casella'}
          </button>
        </div>
        <p className="mt-2 h-4 text-center text-xs text-ink-400">
          {over
            ? 'Partita finita'
            : !canAct
              ? 'Guarda i suoi lanci: tocca a te dopo'
              : joker
                ? `Cinquina extra! +${EXTRA_CINQUINA} e jolly su full e scale`
                : rolls === 0
                  ? 'Lancia per iniziare il turno'
                  : rolls < 3
                    ? 'Tocca i dadi da tenere, poi rilancia o scegli una casella'
                    : 'Scegli una casella del foglio'}
        </p>
      </section>

      {/* Foglio punti */}
      <section className="min-h-0 flex-1 overflow-y-auto rounded-3xl bg-ink-900 ring-1 ring-white/5">
        <table className="w-full text-sm">
          <colgroup>
            <col />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-ink-900">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-500">Casella</th>
              {([0, 1] as Side[]).map((s) => (
                <th
                  key={s}
                  className={`truncate px-1 py-2 text-center text-xs font-bold ${PC.text[s]} ${
                    s === turn && !over ? `border-b-2 ${PC.border[s]}` : ''
                  }`}
                >
                  {playerName(names, s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UPPER.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.04]">
                <td className="flex items-center gap-2 px-3 py-1.5 text-ink-200">
                  <span className="w-5">
                    <Die value={u.face} held={false} rolling={false} />
                  </span>
                  {u.label}
                </td>
                <Cell side={0} cat={u.id} />
                <Cell side={1} cat={u.id} />
              </tr>
            ))}
            <tr className="border-b border-white/10 bg-white/[0.03] text-xs">
              <td className="px-3 py-1.5 text-ink-400">
                Bonus{' '}
                <span className="text-ink-500">
                  (≥ {BONUS_AT} → +{BONUS})
                </span>
              </td>
              {tot.map((t, s) => (
                <td
                  key={s}
                  className={`px-1 py-1.5 text-center tabular-nums ${t.bonus ? `font-bold ${PC.text[s]}` : 'text-ink-500'}`}
                >
                  {t.bonus ? `+${t.bonus}` : `${t.upper}/${BONUS_AT}`}
                </td>
              ))}
            </tr>
            {LOWER.map((l) => (
              <tr key={l.id} className="border-b border-white/[0.04]">
                <td className="px-3 py-1.5">
                  <span className="text-ink-200">{l.label}</span>
                  <span className="block text-[11px] leading-tight text-ink-500">{l.hint}</span>
                </td>
                <Cell side={0} cat={l.id} />
                <Cell side={1} cat={l.id} />
              </tr>
            ))}
            {(extra[0] > 0 || extra[1] > 0) && (
              <tr className="border-b border-white/[0.04] text-xs">
                <td className="px-3 py-1.5 text-ink-400">Cinquine extra</td>
                {extra.map((e, s) => (
                  <td key={s} className="px-1 py-1.5 text-center tabular-nums text-ink-200">
                    {e ? `+${e}` : ''}
                  </td>
                ))}
              </tr>
            )}
            <tr className="bg-white/[0.04]">
              <td className="px-3 py-2.5 font-display text-base font-extrabold">Totale</td>
              {tot.map((t, s) => (
                <td
                  key={s}
                  className={`px-1 py-2.5 text-center font-display text-lg font-extrabold tabular-nums ${PC.text[s]}`}
                >
                  {t.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
