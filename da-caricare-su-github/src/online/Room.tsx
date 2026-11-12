import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Copy, Share2, UserRound } from 'lucide-react';
import Loading from '../components/Loading';
import { gameById, ONLINE_GAMES } from '../games';
import { PC, type Names, type Result, type Side } from '../lib/store';
import GameScreen, { type OnlineMatch } from '../pages/GameScreen';
import { backend } from './backend';
import { savedOnlineName } from './Lobby';
import {
  backToRoomMenu,
  clientId,
  joinRoom,
  rematch,
  roomPath,
  saveResult,
  scoresFrom,
  slot,
  startGame,
  type RoomMeta,
  type RoomResults,
} from './roomApi';

interface Props {
  code: string;
  defaultName: string;
  onLeave: () => void;
}

export default function Room({ code, defaultName, onLeave }: Props) {
  const [meta, setMeta] = useState<RoomMeta | null | undefined>(undefined); // undefined = sto caricando
  const [results, setResults] = useState<RoomResults | null>(null);
  const [error, setError] = useState<'' | 'full' | 'missing'>('');

  useEffect(() => {
    const offMeta = backend.subscribe(`${roomPath(code)}/meta`, (v) => setMeta((v as RoomMeta | null) ?? null));
    const offRes = backend.subscribe(`${roomPath(code)}/results`, (v) => setResults(v as RoomResults | null));
    return () => {
      offMeta();
      offRes();
    };
  }, [code]);

  const id = clientId();
  const me: Side | null = meta?.players?.p0?.id === id ? 0 : meta?.players?.p1?.id === id ? 1 : null;

  // entra nel posto libero (o rientra nel proprio) appena la stanza è caricata
  useEffect(() => {
    if (!meta || me !== null || error) return;
    joinRoom(code, savedOnlineName(defaultName).trim() || 'Giocatore 2').then((r) => {
      if (r === 'full' || r === 'missing') setError(r);
    });
  }, [meta, me, code, defaultName, error]);

  // presenza: segna "online" il mio posto finché la pagina è aperta
  useEffect(() => {
    if (me === null) return;
    return backend.presence(`${roomPath(code)}/meta/players/${slot(me)}`);
  }, [me, code]);

  const names: Names = [meta?.players?.p0?.name ?? 'Giocatore 1', meta?.players?.p1?.name ?? 'In attesa…'];
  const scores = useMemo(() => scoresFrom(results), [results]);
  const game = meta?.game ? gameById(meta.game) : undefined;
  const bothIn = !!meta?.players?.p0 && !!meta?.players?.p1;
  const round = meta?.round ?? 0;

  const onResult = useCallback(
    (r: Result) => {
      if (game) saveResult(code, round, game.id, r).catch(() => {});
    },
    [code, round, game],
  );

  const online: OnlineMatch | undefined = useMemo(
    () =>
      me === null
        ? undefined
        : {
            me,
            round,
            path: `${roomPath(code)}/rounds/r${round}`,
            onAgain: () => void rematch(code, round).catch(() => {}),
            peerOnline: meta?.players?.[slot(me === 0 ? 1 : 0)]?.online !== false,
          },
    [me, round, code, meta],
  );

  if (error) {
    return (
      <Centered onLeave={onLeave}>
        <p className="font-display text-2xl font-extrabold">
          {error === 'full' ? 'Stanza piena' : 'Stanza non trovata'}
        </p>
        <p className="text-sm text-ink-400">
          {error === 'full'
            ? 'In questa stanza ci sono già due giocatori.'
            : `Controlla il codice ${code}: forse è sbagliato.`}
        </p>
      </Centered>
    );
  }
  if (meta === undefined || (meta && me === null)) return <Loading text="Entro nella stanza…" />;
  if (meta === null) {
    return (
      <Centered onLeave={onLeave}>
        <p className="font-display text-2xl font-extrabold">Stanza non trovata</p>
        <p className="text-sm text-ink-400">Controlla il codice {code}: forse è sbagliato.</p>
      </Centered>
    );
  }

  if (game && bothIn && online) {
    return (
      <GameScreen
        key={game.id}
        game={game}
        names={names}
        score={scores[game.id] ?? [0, 0]}
        onResult={onResult}
        onExit={() => void backToRoomMenu(code).catch(() => {})}
        online={online}
      />
    );
  }

  return <RoomMenu code={code} meta={meta} me={me!} names={names} scores={scores} onLeave={onLeave} />;
}

function Centered({ children, onLeave }: { children: React.ReactNode; onLeave: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
      <button className="btn-ghost mt-4" onClick={onLeave}>
        <ArrowLeft className="h-4 w-4" /> Torna al menu
      </button>
    </div>
  );
}

function RoomMenu({
  code,
  meta,
  me,
  names,
  scores,
  onLeave,
}: {
  code: string;
  meta: RoomMeta;
  me: Side;
  names: Names;
  scores: Record<string, [number, number]>;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const bothIn = !!meta.players.p0 && !!meta.players.p1;
  const link = `${window.location.origin}${window.location.pathname}${window.location.search}#/online/${code}`;

  async function share() {
    const text = `Giochiamo a Duello! Entra nella stanza ${code}: ${link}`;
    try {
      if (canShare) {
        await navigator.share({ title: 'Duello', text, url: link });
        return;
      }
    } catch {
      /* annullato: provo a copiare */
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* niente appunti: resta il codice a schermo */
    }
  }

  const total = Object.values(scores).reduce((t, s) => [t[0] + s[0], t[1] + s[1]], [0, 0]);

  return (
    <div className="safe-top safe-bottom mx-auto min-h-full max-w-xl px-4 pb-10">
      <div className="flex items-center gap-2 py-2">
        <button className="icon-btn" onClick={onLeave} aria-label="Esci dalla stanza">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-sm font-medium text-ink-400">Stanza online</span>
        <span className="w-10" />
      </div>

      <section className="mt-2 rounded-3xl bg-ink-900 p-5 text-center ring-1 ring-white/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Codice stanza</p>
        <p className="mt-1 font-display text-5xl font-extrabold tracking-[0.25em]">{code}</p>
        <button className="btn-ghost mt-4" onClick={share}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : canShare ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Link copiato' : 'Invia il link'}
        </button>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {([0, 1] as Side[]).map((s) => {
          const p = meta.players[slot(s)];
          return (
            <div key={s} className={`rounded-3xl p-4 ring-1 ring-inset ring-white/5 ${PC.bgSoft[s]}`}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${PC.text[s]}`}>
                <span
                  className={`h-2 w-2 rounded-full ${p ? (p.online === false ? 'bg-ink-500' : 'bg-emerald-400') : 'bg-ink-600'}`}
                />
                {s === me ? 'Tu' : p ? (p.online === false ? 'Disconnesso' : 'Online') : 'Manca'}
              </p>
              <p className={`mt-1 truncate font-display text-xl font-extrabold ${p ? 'text-ink-50' : 'text-ink-500'}`}>
                {p ? names[s] : 'In attesa…'}
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{total[s]}</p>
              <p className="text-xs text-ink-400">vittorie</p>
            </div>
          );
        })}
      </section>

      {!bothIn ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <UserRound className="h-8 w-8 animate-pulse text-ink-500" />
          <p className="text-sm text-ink-300">
            Manda il link o il codice <b>{code}</b> all’altra persona.
            <br />
            Quando entra, scegliete un gioco.
          </p>
        </div>
      ) : (
        <section className="mt-8">
          <h2 className="font-display text-lg font-extrabold">Scegli un gioco</h2>
          <p className="mb-3 text-xs text-ink-400">Il gioco si apre su entrambi i telefoni</p>
          <div className="grid grid-cols-1 gap-2.5">
            {ONLINE_GAMES.map((g) => {
              const sc = scores[g.id] ?? [0, 0];
              return (
                <button
                  key={g.id}
                  onClick={() => void startGame(code, g.id).catch(() => {})}
                  className="group flex items-center gap-4 rounded-3xl bg-ink-900 p-3 pr-4 text-left ring-1 ring-white/5 transition hover:bg-ink-800 active:scale-[0.99]"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${g.tint}`}
                  >
                    <g.icon className="h-6 w-6 text-ink-50" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-50">{g.name}</span>
                    <span className="block truncate text-sm text-ink-400">{g.tagline}</span>
                  </span>
                  {(sc[0] > 0 || sc[1] > 0) && (
                    <span className="text-sm font-bold tabular-nums">
                      <span className={PC.text[0]}>{sc[0]}</span>
                      <span className="mx-1 text-ink-600">–</span>
                      <span className={PC.text[1]}>{sc[1]}</span>
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-ink-600 transition group-hover:translate-x-0.5 group-hover:text-ink-300" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
