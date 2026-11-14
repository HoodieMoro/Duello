import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { other, PC, playerName, type Names, type Side } from '../lib/store';
import { useSession } from '../online/shared';

/**
 * Giochi con informazioni nascoste (carte in mano, lettere sul leggio).
 * - online: ognuno vede sempre il proprio lato (viewer = me)
 * - stesso telefono: quando cambia chi deve agire, compare "Passa il telefono a …"
 *   finché quella persona non tocca lo schermo.
 */
export function usePrivateView(active: Side | null) {
  const { me } = useSession();
  const [shownFor, setShownFor] = useState<Side | null>(null);
  if (me !== null) return { viewer: me, covered: false, reveal: () => {}, online: true };
  const viewer = active ?? shownFor ?? 0;
  return {
    viewer,
    covered: active !== null && shownFor !== active,
    reveal: () => setShownFor(active),
    online: false,
  };
}

export function PassScreen({
  who,
  names,
  note,
  onReady,
}: {
  who: Side;
  names: Names;
  note?: string;
  onReady: () => void;
}) {
  return (
    <button
      onClick={onReady}
      className="anim-fade-up flex h-full w-full flex-col items-center justify-center gap-5 rounded-3xl bg-ink-900 p-6 text-center"
    >
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ${PC.bgSoft[who]}`}>
        <EyeOff className={`h-7 w-7 ${PC.text[who]}`} />
      </span>
      <span className="text-sm font-medium uppercase tracking-widest text-ink-400">Passa il telefono a</span>
      <span className={`font-display text-4xl font-extrabold ${PC.text[who]}`}>{playerName(names, who)}</span>
      {note && <span className="max-w-xs rounded-2xl bg-white/5 px-4 py-2 text-sm text-ink-200">{note}</span>}
      <span className="text-sm text-ink-400">
        {playerName(names, other(who))}, non guardare!
        <br />
        {playerName(names, who)}, tocca lo schermo quando sei pronto/a.
      </span>
    </button>
  );
}
