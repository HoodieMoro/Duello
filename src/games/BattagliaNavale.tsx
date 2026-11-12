import { useEffect, useMemo, useState } from 'react';
import { Check, Crosshair, EyeOff, Hourglass, Shuffle } from 'lucide-react';
import Loading from '../components/Loading';
import { buzz, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useReport, useSession, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

const S = 8; // lato griglia
const FLEET = [4, 3, 3, 2, 2];

type Fleet = number[][]; // ogni nave = elenco di caselle
type Shots = boolean[]; // colpi ricevuti su una griglia

interface LastShot {
  who: Side;
  cell: number;
  hit: boolean;
  sunk: boolean;
  /** contatore dei colpi, per riconoscere un colpo nuovo */
  n: number;
}

interface State {
  fleets: [Fleet, Fleet];
  ready: [boolean, boolean];
  /** shots[i] = colpi ricevuti dalla flotta del giocatore i */
  shots: [Shots, Shots];
  turn: Side;
  last: LastShot | null;
  result: Result | null;
}

/** Solo sullo stesso telefono: schermate "passa il telefono" e attesa dopo il colpo. */
type View =
  | { kind: 'setup'; who: Side }
  | { kind: 'cover'; who: Side; next: 'setup' | 'play' }
  | { kind: 'play' }
  | { kind: 'shot' };

function fireAt(st: State, cell: number): State {
  if (st.result !== null || !st.ready[0] || !st.ready[1]) return st;
  const who = st.turn;
  const enemy = other(who);
  if (st.shots[enemy][cell]) return st;
  const shots = [...st.shots] as [Shots, Shots];
  shots[enemy] = [...shots[enemy]];
  shots[enemy][cell] = true;
  const ship = st.fleets[enemy].find((sh) => sh.includes(cell));
  const hit = !!ship;
  const sunk = !!ship && isSunk(ship, shots[enemy]);
  const won = st.fleets[enemy].every((sh) => isSunk(sh, shots[enemy]));
  return {
    ...st,
    shots,
    last: { who, cell, hit, sunk, n: (st.last?.n ?? 0) + 1 },
    turn: hit ? who : enemy, // se colpisci spari ancora
    result: won ? who : null,
  };
}

function setReady(st: State, who: Side): State {
  if (st.ready[who]) return st;
  const ready = [...st.ready] as [boolean, boolean];
  ready[who] = true;
  return { ...st, ready };
}

function reshuffle(st: State, who: Side): State {
  if (st.ready[who]) return st;
  const fleets = [...st.fleets] as [Fleet, Fleet];
  fleets[who] = randomFleet();
  return { ...st, fleets };
}

const shotBuzz = (l: LastShot) => (l.hit ? (l.sunk ? [30, 50, 30, 50, 60] : [25, 40, 25]) : 10);

function randomFleet(): Fleet {
  for (let attempt = 0; attempt < 500; attempt++) {
    const taken = new Set<number>(); // occupate + adiacenti (le navi non si toccano)
    const fleet: Fleet = [];
    let ok = true;
    for (const len of FLEET) {
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? S : S - len + 1));
        const c = Math.floor(Math.random() * (horiz ? S - len + 1 : S));
        const cells = Array.from({ length: len }, (_, k) => (horiz ? r * S + c + k : (r + k) * S + c));
        if (cells.some((x) => taken.has(x))) continue;
        for (const x of cells) {
          const xr = Math.floor(x / S);
          const xc = x % S;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const rr = xr + dr;
              const cc = xc + dc;
              if (rr >= 0 && rr < S && cc >= 0 && cc < S) taken.add(rr * S + cc);
            }
        }
        fleet.push(cells);
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return fleet;
  }
  throw new Error('Impossibile disporre la flotta');
}

const isSunk = (ship: number[], shots: Shots) => ship.every((x) => shots[x]);

function Grid({
  fleet,
  shots,
  revealShips,
  onFire,
  highlight,
  size,
}: {
  fleet: Fleet;
  shots: Shots;
  revealShips: boolean;
  onFire?: (cell: number) => void;
  highlight?: number;
  size: number;
}) {
  const shipAt = useMemo(() => {
    const m = new Map<number, number>();
    fleet.forEach((ship, k) => ship.forEach((x) => m.set(x, k)));
    return m;
  }, [fleet]);

  return (
    <div
      className="grid gap-[3px] rounded-2xl bg-sky-950/60 p-[5px] ring-1 ring-sky-400/15"
      style={{ width: size, height: size, gridTemplateColumns: `repeat(${S}, 1fr)` }}
    >
      {Array.from({ length: S * S }, (_, i) => {
        const k = shipAt.get(i);
        const hasShip = k !== undefined;
        const shot = shots[i];
        const sunk = hasShip && isSunk(fleet[k], shots);
        const showShip = hasShip && (revealShips || sunk);
        const canFire = onFire && !shot;
        return (
          <button
            key={i}
            disabled={!canFire}
            onClick={() => canFire && onFire(i)}
            aria-label={`Riga ${Math.floor(i / S) + 1}, colonna ${(i % S) + 1}`}
            className={`relative flex items-center justify-center rounded-[5px] transition ${
              showShip ? (sunk ? 'bg-ink-500' : 'bg-ink-300') : 'bg-sky-900/40'
            } ${canFire ? 'hover:bg-sky-700/60 active:bg-sky-600/60' : ''} ${
              highlight === i ? 'ring-2 ring-white' : ''
            }`}
          >
            {shot && hasShip && (
              <span className={`anim-pop h-[62%] w-[62%] rounded-full ${sunk ? 'bg-p1-deep' : 'bg-p1'}`}>
                <span className="block h-full w-full scale-50 rounded-full bg-amber-200/80" />
              </span>
            )}
            {shot && !hasShip && <span className="anim-pop h-[26%] w-[26%] rounded-full bg-sky-200/50" />}
          </button>
        );
      })}
    </div>
  );
}

function FleetStatus({ fleet, shots }: { fleet: Fleet; shots: Shots }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {fleet.map((ship, k) => {
        const sunk = isSunk(ship, shots);
        return (
          <span key={k} className="flex gap-[2px]">
            {ship.map((x) => (
              <span
                key={x}
                className={`h-2.5 w-2.5 rounded-[3px] ${sunk ? 'bg-p1-deep/70' : shots[x] ? 'bg-p1' : 'bg-ink-300'}`}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

export default function BattagliaNavale({ starter, names, onTurn, onEnd }: GameProps) {
  const { me } = useSession();
  const fit = useFit(1);
  const [view, setView] = useState<View>({ kind: 'setup', who: starter });
  const [s, update] = useShared<State>(() => ({
    fleets: [randomFleet(), randomFleet()],
    ready: [false, false],
    shots: [Array(S * S).fill(false), Array(S * S).fill(false)],
    turn: starter,
    last: null,
    result: null,
  }));
  const playing = !!s && s.ready[0] && s.ready[1];
  useReport(playing ? s!.turn : undefined, s?.result, onTurn, onEnd);

  // online: vibra quando l'altro ti spara
  const lastN = s?.last?.n;
  useEffect(() => {
    if (me !== null && s?.last && s.last.who !== me) buzz(shotBuzz(s.last));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastN]);

  const name = (x: Side) => playerName(names, x);

  return (
    <div ref={fit.ref} className="h-full w-full">
      {fit.cw > 0 && (s ? render(s) : <Loading />)}
    </div>
  );

  function fire(st: State, cell: number) {
    const after = fireAt(st, cell);
    if (after === st) return;
    buzz(shotBuzz(after.last!));
    update((x) => fireAt(x, cell));
    if (me === null) setView({ kind: 'shot' });
  }

  function render(st: State) {
    // ───────── Online: ognuno sul suo telefono ─────────
    if (me !== null) {
      if (!st.ready[me]) return setupScreen(st, me, () => update((x) => setReady(x, me)));
      if (!st.ready[other(me)]) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <Hourglass className="h-8 w-8 animate-pulse text-ink-400" />
            <p className="text-sm text-ink-300">
              In attesa che <b className={PC.text[other(me)]}>{name(other(me))}</b> prepari la sua flotta…
            </p>
            <Grid
              fleet={st.fleets[me]}
              shots={st.shots[me]}
              revealShips
              size={Math.floor(Math.min(fit.cw, fit.ch - 150, 360))}
            />
          </div>
        );
      }
      const myTurn = st.turn === me && st.result === null;
      const l = st.last;
      return playScreen(
        st,
        me,
        myTurn,
        <p className="flex items-center gap-2 text-sm text-ink-300">
          <Crosshair className={`h-4 w-4 shrink-0 ${PC.text[st.turn]}`} />
          <span>
            {st.result !== null
              ? st.result === me
                ? 'Hai affondato tutta la flotta!'
                : 'La tua flotta è affondata.'
              : l && l.who === me && myTurn
                ? `${l.sunk ? 'Colpita e affondata!' : 'Colpita!'} Spara ancora.`
                : myTurn
                  ? l && l.who !== me
                    ? `${name(l.who)} ha fatto acqua. Tocca a te: spara!`
                    : 'Tocca a te: scegli dove sparare'
                  : l && l.who === me
                    ? `Acqua. Ora spara ${name(st.turn)}…`
                    : l && l.hit
                      ? `${name(l.who)} ti ha colpito${l.sunk ? ' e affondato una nave' : ''}! Spara ancora…`
                      : `Turno di ${name(st.turn)}…`}
          </span>
        </p>,
      );
    }

    // ───────── Stesso telefono ─────────
    if (view.kind === 'cover') {
      const who = view.who;
      return (
        <button
          onClick={() => setView(view.next === 'setup' ? { kind: 'setup', who } : { kind: 'play' })}
          className="anim-fade-up flex h-full w-full flex-col items-center justify-center gap-5 rounded-3xl bg-ink-900 p-6 text-center"
        >
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${PC.bgSoft[who]}`}>
            <EyeOff className={`h-7 w-7 ${PC.text[who]}`} />
          </span>
          <span className="text-sm font-medium uppercase tracking-widest text-ink-400">Passa il telefono a</span>
          <span className={`font-display text-4xl font-extrabold ${PC.text[who]}`}>{name(who)}</span>
          <span className="text-sm text-ink-400">
            {name(other(who))}, non guardare!
            <br />
            {name(who)}, tocca lo schermo quando sei pronto/a.
          </span>
        </button>
      );
    }

    if (view.kind === 'setup') {
      const who = view.who;
      return setupScreen(st, who, () => {
        update((x) => setReady(x, who));
        setView(
          who === starter
            ? { kind: 'cover', who: other(who), next: 'setup' }
            : { kind: 'cover', who: starter, next: 'play' },
        );
      });
    }

    if (view.kind === 'shot' && st.last) {
      const l = st.last;
      return playScreen(
        st,
        l.who,
        false,
        <>
          <p className="anim-pop font-display text-2xl font-extrabold">
            {st.result !== null ? 'Flotta affondata!' : l.sunk ? 'Colpita e affondata!' : l.hit ? 'Colpita!' : 'Acqua.'}
          </p>
          {st.result === null &&
            (l.hit ? (
              <button className="btn-primary" onClick={() => setView({ kind: 'play' })}>
                <Crosshair className="h-4 w-4" /> Spara ancora
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setView({ kind: 'cover', who: other(l.who), next: 'play' })}
              >
                Passa a {name(other(l.who))}
              </button>
            ))}
        </>,
        l.cell,
      );
    }

    return playScreen(
      st,
      st.turn,
      st.result === null,
      <p className="flex items-center gap-2 text-sm text-ink-300">
        <Crosshair className={`h-4 w-4 ${PC.text[st.turn]}`} />
        <span>
          <b className={PC.text[st.turn]}>{name(st.turn)}</b>, scegli dove sparare
        </span>
      </p>,
    );
  }

  function setupScreen(st: State, who: Side, onReady: () => void) {
    const big = Math.floor(Math.min(fit.cw, fit.ch - 150, 520));
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className={`font-display text-2xl font-extrabold ${PC.text[who]}`}>{name(who)}</p>
          <p className="text-sm text-ink-400">Ecco la tua flotta. Ti piace così?</p>
        </div>
        <Grid fleet={st.fleets[who]} shots={Array(S * S).fill(false)} revealShips size={big} />
        <div className="flex gap-3">
          <button
            className="btn-ghost"
            onClick={() => {
              buzz(8);
              update((x) => reshuffle(x, who));
            }}
          >
            <Shuffle className="h-4 w-4" /> Rimescola
          </button>
          <button className="btn-primary" onClick={onReady}>
            <Check className="h-4 w-4" /> Pronto
          </button>
        </div>
      </div>
    );
  }

  /** viewer = chi guarda lo schermo: vede la griglia nemica in grande e la propria in piccolo */
  function playScreen(st: State, viewer: Side, canFire: boolean, status: React.ReactNode, highlight?: number) {
    const enemy = other(viewer);
    const big = Math.floor(Math.min(fit.cw, (fit.ch - 150) / 1.36, 520));
    const small = Math.floor(big * 0.34);
    const lastOnEnemy = st.last && st.last.who === viewer ? st.last.cell : undefined;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <div className="flex w-full items-end justify-between gap-2" style={{ maxWidth: big }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-ink-400">Flotta di</p>
            <p className={`font-display text-xl font-extrabold leading-tight ${PC.text[enemy]}`}>{name(enemy)}</p>
          </div>
          <FleetStatus fleet={st.fleets[enemy]} shots={st.shots[enemy]} />
        </div>

        <Grid
          fleet={st.fleets[enemy]}
          shots={st.shots[enemy]}
          revealShips={st.result !== null}
          onFire={canFire ? (c) => fire(st, c) : undefined}
          highlight={highlight ?? lastOnEnemy}
          size={big}
        />

        <div className="flex min-h-[3.25rem] w-full items-center justify-between gap-3" style={{ maxWidth: big }}>
          {status}
        </div>

        <div className="flex items-center gap-3 self-center rounded-2xl bg-white/[0.03] p-2 pr-4">
          <Grid
            fleet={st.fleets[viewer]}
            shots={st.shots[viewer]}
            revealShips
            size={small}
            highlight={st.last && st.last.who === enemy ? st.last.cell : undefined}
          />
          <div className="text-xs leading-relaxed text-ink-400">
            <p className="font-semibold text-ink-200">La tua flotta</p>
            <p>con i colpi di {name(enemy)}</p>
          </div>
        </div>
      </div>
    );
  }
}
