import { useState } from 'react';
import { ChevronRight, Globe, Pencil, Trash2 } from 'lucide-react';
import { GAMES, SECTIONS, sectionOf } from '../games';
import { PC, playerName, totals, type Score, type Side, type Store } from '../lib/store';

interface Props {
  store: Store;
  onName: (side: Side, name: string) => void;
  onPlay: (id: string) => void;
  onReset: () => void;
}

export default function Home({ store, onName, onPlay, onReset }: Props) {
  const total = totals(store.scores);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="safe-top safe-bottom mx-auto min-h-full max-w-xl px-4 pb-10">
      <header className="pt-6 text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          <span className="text-p1">Duel</span>
          <span className="text-p2">lo</span>
        </h1>
        <p className="mt-1 text-sm text-ink-400">Giochi in due: sullo stesso telefono o online</p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        {([0, 1] as Side[]).map((s) => (
          <label
            key={s}
            className={`group relative block rounded-3xl p-4 ring-1 ring-inset ring-white/5 ${PC.bgSoft[s]}`}
          >
            <span className={`text-xs font-semibold uppercase tracking-widest ${PC.text[s]}`}>Giocatore {s + 1}</span>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                value={store.names[s]}
                onChange={(e) => onName(s, e.target.value)}
                placeholder={`Giocatore ${s + 1}`}
                maxLength={16}
                className="w-full min-w-0 bg-transparent font-display text-xl font-extrabold text-ink-50 outline-none placeholder:text-ink-50/60"
              />
              <Pencil className="h-3.5 w-3.5 shrink-0 text-ink-400 group-focus-within:opacity-0" />
            </div>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">{total[s]}</p>
            <p className="text-xs text-ink-400">vittorie totali</p>
          </label>
        ))}
      </section>

      <button
        onClick={() => onPlay('online')}
        className="group mt-4 flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-p1/20 to-p2/20 p-4 text-left ring-1 ring-white/10 transition hover:from-p1/30 hover:to-p2/30 active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-950/40">
          <Globe className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold">Gioca online</span>
          <span className="block text-sm text-ink-300">Ognuno sul suo telefono, anche a distanza</span>
        </span>
        <ChevronRight className="h-5 w-5 text-ink-400 transition group-hover:translate-x-0.5" />
      </button>

      {SECTIONS.map((sec) => (
        <section key={sec.id} className="mt-8">
          <h2 className="font-display text-lg font-extrabold">{sec.title}</h2>
          <p className="mb-3 text-xs text-ink-400">{sec.hint}</p>
          <div className="grid grid-cols-1 gap-2.5">
            {GAMES.filter((g) => sectionOf(g) === sec.id).map((g) => {
              const sc: Score = store.scores[g.id] ?? [0, 0];
              return (
                <button
                  key={g.id}
                  onClick={() => onPlay(g.id)}
                  className="group flex items-center gap-4 rounded-3xl bg-ink-900 p-3 pr-4 text-left ring-1 ring-white/5 transition hover:bg-ink-800 active:scale-[0.99]"
                >
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${g.tint}`}
                  >
                    <g.icon className="h-7 w-7 text-ink-50" strokeWidth={2.2} />
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
      ))}

      <footer className="mt-10 flex flex-col items-center gap-2 text-center">
        {total[0] + total[1] > 0 &&
          (confirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-300">Azzerare tutti i punteggi?</span>
              <button className="btn-ghost py-1.5" onClick={() => setConfirm(false)}>
                No
              </button>
              <button
                className="btn py-1.5 bg-p1-deep text-white"
                onClick={() => {
                  onReset();
                  setConfirm(false);
                }}
              >
                Sì, azzera
              </button>
            </div>
          ) : (
            <button className="btn-ghost text-ink-400" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> Azzera punteggi
            </button>
          ))}
        <p className="text-xs text-ink-600">
          Stesso telefono: {playerName(store.names, 0)} gioca in basso · {playerName(store.names, 1)} in alto
        </p>
      </footer>
    </div>
  );
}
