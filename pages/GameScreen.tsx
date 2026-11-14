import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleHelp, House, RotateCcw, Trophy, WifiOff, X } from 'lucide-react';
import type { GameDef } from '../games/types';
import { PC, playerName, type Names, type Result, type Score, type Side } from '../lib/store';
import { SessionCtx, type Session } from '../online/shared';

export interface OnlineMatch {
  me: Side;
  /** numero della partita nella stanza (cambia a ogni rivincita) */
  round: number;
  /** nodo del database con lo stato di questa partita */
  path: string;
  onAgain: () => void;
  peerOnline: boolean;
}

interface Props {
  game: GameDef;
  names: Names;
  score: Score;
  onResult: (result: Result) => void;
  onExit: () => void;
  online?: OnlineMatch;
}

export default function GameScreen({ game, names, score, onResult, onExit, online }: Props) {
  const [localRound, setLocalRound] = useState(0);
  const round = online ? online.round : localRound;
  const starter = (round % 2) as Side;
  const [turn, setTurn] = useState<Side>(starter);
  const [result, setResult] = useState<Result | null>(null);
  const [rules, setRules] = useState(false);

  // callback legati alla partita in corso: chiamate in ritardo da partite vecchie vengono ignorate
  const roundRef = useRef(round);
  roundRef.current = round;
  const ended = useRef(false);

  useEffect(() => {
    setTurn(starter);
    setResult(null);
    ended.current = false;
  }, [round, starter]);

  const onTurn = useCallback(
    (r: number) => (s: Side) => {
      if (roundRef.current === r) setTurn(s);
    },
    [],
  );
  const onEnd = useCallback(
    (r: number) => (res: Result) => {
      if (roundRef.current !== r || ended.current) return;
      ended.current = true;
      onResult(res);
      window.setTimeout(
        () => {
          if (roundRef.current === r) setResult(res);
        },
        game.mode === 'live' ? 600 : 900,
      );
    },
    [onResult, game.mode],
  );
  const handlers = useMemo(() => ({ onTurn: onTurn(round), onEnd: onEnd(round) }), [onTurn, onEnd, round]);

  const Game = game.component;
  const session = useMemo<Session>(
    () => (online ? { me: online.me, path: online.path } : { me: null, path: null }),
    [online?.me, online?.path], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const board = (
    <SessionCtx.Provider value={session}>
      <Game key={round} starter={starter} names={names} onTurn={handlers.onTurn} onEnd={handlers.onEnd} />
    </SessionCtx.Provider>
  );
  const again = online ? online.onAgain : () => setLocalRound((r) => r + 1);
  const playing = result === null;

  const overlays = (
    <>
      {result !== null && (
        <ResultCard
          result={result}
          names={names}
          score={score}
          flip={!online && game.mode !== 'turns'}
          onAgain={again}
          onExit={onExit}
        />
      )}
      {rules && <RulesSheet game={game} onClose={() => setRules(false)} />}
    </>
  );

  if (game.mode === 'live') {
    return (
      <div className="game-surface fixed inset-0 mx-auto max-w-xl bg-ink-950">
        {board}
        {playing && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-between px-2">
            <button
              className="icon-btn pointer-events-auto h-9 w-9 bg-ink-950/70 backdrop-blur"
              onClick={onExit}
              aria-label="Torna al menu"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              className="icon-btn pointer-events-auto h-9 w-9 bg-ink-950/70 backdrop-blur"
              onClick={() => setRules(true)}
              aria-label="Regole"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        )}
        {overlays}
      </div>
    );
  }

  const toolbar = (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <button className="icon-btn" onClick={onExit} aria-label="Torna al menu">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="flex-1 truncate text-center font-display text-lg font-extrabold">{game.name}</h1>
      <button className="icon-btn" onClick={() => setRules(true)} aria-label="Regole">
        <CircleHelp className="h-5 w-5" />
      </button>
    </div>
  );

  if (game.mode === 'turns' || online) {
    // online ognuno ha il suo telefono: niente scritte capovolte
    return (
      <div className="game-surface safe-top safe-bottom fixed inset-0 mx-auto flex max-w-xl flex-col bg-ink-950">
        {toolbar}
        <div className="grid grid-cols-2 gap-2 px-3 pb-2">
          {([0, 1] as Side[]).map((s) => (
            <PlayerChip
              key={s}
              side={s}
              names={names}
              wins={score[s]}
              active={playing && turn === s}
              you={online?.me === s}
            />
          ))}
        </div>
        {online && !online.peerOnline && (
          <p className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            <WifiOff className="h-4 w-4 shrink-0" />
            {playerName(names, online.me === 0 ? 1 : 0)} si è disconnesso/a: la partita riprende quando rientra.
          </p>
        )}
        <main className="min-h-0 flex-1 px-3 pb-2">{board}</main>
        {overlays}
      </div>
    );
  }

  // table: G2 in alto capovolto, G1 in basso
  return (
    <div className="game-surface safe-top safe-bottom fixed inset-0 mx-auto flex max-w-xl flex-col bg-ink-950">
      <div className="rotate-180 px-3 pt-1">
        <PlayerChip side={1} names={names} wins={score[1]} active={playing && turn === 1} big />
      </div>
      {toolbar}
      <main className="min-h-0 flex-1 px-3 py-1">{board}</main>
      <div className="px-3 pb-1">
        <PlayerChip side={0} names={names} wins={score[0]} active={playing && turn === 0} big />
      </div>
      {overlays}
    </div>
  );
}

function PlayerChip({
  side,
  names,
  wins,
  active,
  big,
  you,
}: {
  side: Side;
  names: Names;
  wins: number;
  active: boolean;
  big?: boolean;
  you?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3 transition ${big ? 'py-2.5' : 'py-2'} ${
        active ? `${PC.bgSoft[side]} ring-2 ${PC.ring[side]}` : 'bg-white/[0.03]'
      }`}
    >
      <span className={`h-3 w-3 shrink-0 rounded-full ${PC.bg[side]} ${active ? 'anim-blink' : 'opacity-50'}`} />
      <span
        className={`min-w-0 flex-1 truncate font-semibold ${big ? '' : 'text-sm'} ${active ? 'text-ink-50' : 'text-ink-400'}`}
      >
        {playerName(names, side)}
        {you && <span className="ml-1.5 text-xs font-medium text-ink-400">(tu)</span>}
        {active && big && <span className="ml-2 text-xs font-medium text-ink-300">tocca a te</span>}
      </span>
      <span
        className="flex items-center gap-1 text-sm font-bold tabular-nums text-ink-300"
        title="Vittorie in questo gioco"
      >
        <Trophy className="h-3.5 w-3.5 text-ink-500" />
        {wins}
      </span>
    </div>
  );
}

function ResultCard({
  result,
  names,
  score,
  flip,
  onAgain,
  onExit,
}: {
  result: Result;
  names: Names;
  score: Score;
  flip: boolean;
  onAgain: () => void;
  onExit: () => void;
}) {
  const title = result === 'draw' ? 'Pareggio!' : `Vince ${playerName(names, result)}!`;
  const color = result === 'draw' ? 'text-ink-50' : PC.text[result];
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-ink-950/60 p-6">
      {flip && (
        <p className={`anim-pop rotate-180 text-center font-display text-3xl font-extrabold ${color}`}>{title}</p>
      )}
      <div className="anim-fade-up w-full max-w-xs rounded-3xl bg-ink-800 p-5 text-center shadow-soft ring-1 ring-white/10">
        <Trophy className={`mx-auto h-8 w-8 ${color}`} />
        <p className={`mt-2 font-display text-3xl font-extrabold ${color}`}>{title}</p>
        <p className="mt-3 text-sm text-ink-400">Vittorie in questo gioco</p>
        <p className="font-display text-2xl font-extrabold tabular-nums">
          <span className={PC.text[0]}>{score[0]}</span>
          <span className="mx-2 text-ink-500">–</span>
          <span className={PC.text[1]}>{score[1]}</span>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={onExit}>
            <House className="h-4 w-4" /> Menu
          </button>
          <button className="btn-primary" onClick={onAgain}>
            <RotateCcw className="h-4 w-4" /> Rivincita
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesSheet({ game, onClose }: { game: GameDef; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-ink-950/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="anim-fade-up safe-bottom w-full max-w-md rounded-t-3xl bg-ink-800 p-5 shadow-soft ring-1 ring-white/10 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <game.icon className="h-5 w-5 text-ink-300" />
          <h2 className="flex-1 font-display text-xl font-extrabold">Come si gioca</h2>
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Chiudi">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-2.5 text-sm leading-relaxed text-ink-200">
          {game.rules.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">
                {i + 1}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          Ho capito
        </button>
      </div>
    </div>
  );
}
