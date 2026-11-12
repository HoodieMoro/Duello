import { useState } from 'react';
import { ArrowLeft, Globe, LogIn, Plus, TriangleAlert } from 'lucide-react';
import { onlineAvailable } from './backend';
import { CODE_LENGTH, createRoom, normalizeCode } from './roomApi';

const NAME_KEY = 'duello:online-name';

export function savedOnlineName(fallback: string) {
  try {
    return localStorage.getItem(NAME_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}
function saveOnlineName(n: string) {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* pazienza */
  }
}

interface Props {
  defaultName: string;
  onEnter: (code: string) => void;
  onBack: () => void;
}

export default function Lobby({ defaultName, onEnter, onBack }: Props) {
  const [name, setName] = useState(() => savedOnlineName(defaultName));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cleanName = name.trim();

  async function create() {
    if (!cleanName) return setError('Scrivi il tuo nome');
    setBusy(true);
    setError('');
    try {
      saveOnlineName(cleanName);
      onEnter(await createRoom(cleanName));
    } catch {
      setError('Non riesco a creare la stanza. Controlla la connessione e riprova.');
    } finally {
      setBusy(false);
    }
  }

  function join() {
    if (!cleanName) return setError('Scrivi il tuo nome');
    if (code.length !== CODE_LENGTH) return setError(`Il codice ha ${CODE_LENGTH} caratteri`);
    saveOnlineName(cleanName);
    onEnter(code);
  }

  return (
    <div className="safe-top safe-bottom mx-auto min-h-full max-w-md px-4 pb-10">
      <div className="flex items-center gap-2 py-2">
        <button className="icon-btn" onClick={onBack} aria-label="Indietro">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <header className="mt-2 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-p1/30 to-p2/30">
          <Globe className="h-7 w-7" />
        </span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Gioca online</h1>
        <p className="mt-1 text-sm text-ink-400">Ognuno sul suo telefono, anche a distanza</p>
      </header>

      {!onlineAvailable ? (
        <div className="mt-8 rounded-3xl bg-amber-400/10 p-5 text-sm leading-relaxed text-amber-100 ring-1 ring-amber-400/20">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="h-4 w-4" /> L’online non è ancora attivo
          </p>
          <p className="mt-2 text-amber-100/80">
            Va collegato un database Firebase (gratuito) una volta sola: le istruzioni sono nel README del progetto,
            sezione “Gioco online”. Nel frattempo puoi giocare sullo stesso telefono.
          </p>
        </div>
      ) : (
        <>
          <label className="mt-8 block">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">Il tuo nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="Come ti chiami?"
              className="mt-1.5 w-full rounded-2xl bg-ink-900 px-4 py-3 font-semibold text-ink-50 outline-none ring-1 ring-white/10 placeholder:text-ink-500 focus:ring-white/30"
            />
          </label>

          <button className="btn-primary mt-6 w-full py-3.5 text-base" onClick={create} disabled={busy}>
            <Plus className="h-5 w-5" /> {busy ? 'Creo la stanza…' : 'Crea una stanza'}
          </button>
          <p className="mt-2 text-center text-xs text-ink-500">Poi mandi il link o il codice all’altra persona</p>

          <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-600">
            <span className="h-px flex-1 bg-white/10" /> oppure <span className="h-px flex-1 bg-white/10" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">Hai un codice?</span>
          <div className="mt-1.5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              placeholder="ABCD"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full min-w-0 rounded-2xl bg-ink-900 px-4 py-3 text-center font-display text-2xl font-extrabold tracking-[0.4em] text-ink-50 outline-none ring-1 ring-white/10 placeholder:text-ink-700 focus:ring-white/30"
            />
            <button className="btn-ghost shrink-0 px-5" onClick={join}>
              <LogIn className="h-4 w-4" /> Entra
            </button>
          </div>

          {error && <p className="mt-4 text-center text-sm text-p1">{error}</p>}
        </>
      )}
    </div>
  );
}
