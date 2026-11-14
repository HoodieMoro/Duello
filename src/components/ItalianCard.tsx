/*
 * Mazzo italiano da 40 carte (semi: coppe, denari, spade, bastoni; valori 1–7, Fante, Cavallo, Re).
 * Disegno originale e semplificato: valore negli angoli, seme al centro, figure con la lettera.
 */

export type Suit = 'coppe' | 'denari' | 'spade' | 'bastoni';
export interface Card {
  s: Suit;
  /** 1 = Asso, 2–7, 8 = Fante, 9 = Cavallo, 10 = Re */
  v: number;
}

export const SUITS: Suit[] = ['coppe', 'denari', 'spade', 'bastoni'];
export const SUIT_NAME: Record<Suit, string> = { coppe: 'Coppe', denari: 'Denari', spade: 'Spade', bastoni: 'Bastoni' };
const SUIT_COLOR: Record<Suit, string> = { coppe: '#e11d48', denari: '#d97706', spade: '#2563eb', bastoni: '#15803d' };
const LABEL: Record<number, string> = { 1: 'A', 8: 'F', 9: 'C', 10: 'R' };
const NAME: Record<number, string> = { 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' };

export const cardLabel = (c: Card) => LABEL[c.v] ?? String(c.v);
export const cardName = (c: Card) => `${NAME[c.v] ?? c.v} di ${SUIT_NAME[c.s].toLowerCase()}`;
export const sameCard = (a: Card, b: Card) => a.s === b.s && a.v === b.v;

export function newDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let v = 1; v <= 10; v++) d.push({ s, v });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function SuitIcon({ s, size = 24 }: { s: Suit; size?: number }) {
  const c = SUIT_COLOR[s];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      {s === 'coppe' && (
        <g fill={c}>
          <path d="M8 7h24c0 9-5 15-12 15S8 16 8 7z" />
          <rect x="18" y="21" width="4" height="8" />
          <path d="M11 34c0-3 4-5 9-5s9 2 9 5z" />
        </g>
      )}
      {s === 'denari' && (
        <g>
          <circle cx="20" cy="20" r="15" fill={c} />
          <circle cx="20" cy="20" r="10" fill="none" stroke="#fff7" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="3.5" fill="#fff9" />
        </g>
      )}
      {s === 'spade' && (
        <g fill={c}>
          <path d="M20 3l4 6v17h-8V9z" />
          <rect x="11" y="26" width="18" height="3.5" rx="1.5" />
          <rect x="18" y="29" width="4" height="7" rx="1" />
        </g>
      )}
      {s === 'bastoni' && (
        <g fill={c}>
          <path d="M15 36l3-30c1-3 6-3 7 0l-1 30z" />
          <circle cx="17" cy="14" r="2.2" fill="#fff8" />
          <circle cx="22" cy="22" r="2.2" fill="#fff8" />
        </g>
      )}
    </svg>
  );
}

interface CardViewProps {
  card?: Card | null;
  /** coperta (dorso) */
  back?: boolean;
  w?: number;
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CardView({ card, back, w = 64, selected, dim, onClick, disabled, className = '' }: CardViewProps) {
  const h = Math.round(w * 1.55);
  const Tag = onClick ? 'button' : 'div';
  const base = `relative shrink-0 select-none rounded-[10%/6.5%] shadow-[0_2px_6px_rgba(0,0,0,.35)] transition duration-150 ${className}`;
  if (back || !card) {
    return (
      <Tag
        className={`${base} border-2 border-white/80 bg-[repeating-linear-gradient(45deg,#7f1d1d_0_6px,#991b1b_6px_12px)]`}
        style={{ width: w, height: h }}
        aria-label="Carta coperta"
      />
    );
  }
  const color = SUIT_COLOR[card.s];
  const figure = card.v >= 8;
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={cardName(card)}
      className={`${base} bg-[#fbf7ee] ${selected ? '-translate-y-3 ring-4 ring-white' : ''} ${
        dim ? 'opacity-45' : ''
      } ${onClick && !disabled ? 'hover:-translate-y-1 active:scale-95' : ''}`}
      style={{ width: w, height: h }}
    >
      <span
        className="absolute left-[8%] top-[4%] font-display font-extrabold leading-none"
        style={{ color, fontSize: w * 0.28 }}
      >
        {cardLabel(card)}
      </span>
      <span
        className="absolute bottom-[4%] right-[8%] rotate-180 font-display font-extrabold leading-none"
        style={{ color, fontSize: w * 0.28 }}
      >
        {cardLabel(card)}
      </span>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-[4%]">
        {figure && (
          <span className="font-display font-extrabold leading-none text-ink-800/80" style={{ fontSize: w * 0.22 }}>
            {NAME[card.v]}
          </span>
        )}
        <SuitIcon s={card.s} size={w * (figure ? 0.42 : 0.55)} />
      </span>
    </Tag>
  );
}
