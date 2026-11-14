/*
 * Mazzo italiano da 40 carte disegnato in stile "piacentine":
 * numeri da 1 a 10 negli angoli, tanti simboli quanto il valore della carta,
 * spade ricurve azzurre, bastoni verdi nodosi, coppe dorate, denari gialli e rossi,
 * figure intere (Fante, Cavallo, Re). Il disegno è originale, ispirato alla tradizione.
 */

export type Suit = 'coppe' | 'denari' | 'spade' | 'bastoni';
export interface Card {
  s: Suit;
  /** 1 = Asso, 2–7, 8 = Fante, 9 = Cavallo, 10 = Re */
  v: number;
}

export const SUITS: Suit[] = ['coppe', 'denari', 'spade', 'bastoni'];
export const SUIT_NAME: Record<Suit, string> = { coppe: 'Coppe', denari: 'Denari', spade: 'Spade', bastoni: 'Bastoni' };
const NAME: Record<number, string> = { 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' };

export const cardLabel = (c: Card) => String(c.v);
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

// colori tipici delle carte piacentine
const INK = '#1f1a17';
const GIALLO = '#f2bf2f';
const ROSSO = '#cf2a27';
const BLU = '#2f62ad';
const AZZURRO = '#5b9bd8';
const VERDE = '#2f8a3c';
const MARRONE = '#8a5a2b';
const PELLE = '#f3d2b0';
const CARTA = '#fbf7ee';

const ROBE: Record<Suit, string> = { coppe: ROSSO, denari: GIALLO, spade: BLU, bastoni: VERDE };
const ACCENT: Record<Suit, string> = { coppe: BLU, denari: ROSSO, spade: GIALLO, bastoni: ROSSO };

/** Simbolo del seme disegnato in un quadrato 40×40 */
function PipShape({ s }: { s: Suit }) {
  const st = { stroke: INK, strokeWidth: 1.3, strokeLinejoin: 'round' as const };
  switch (s) {
    case 'denari':
      return (
        <g {...st}>
          <circle cx="20" cy="20" r="16" fill={GIALLO} />
          <circle cx="20" cy="20" r="11" fill={ROSSO} />
          <circle cx="20" cy="20" r="6.5" fill={GIALLO} />
          <circle cx="20" cy="20" r="2.4" fill={VERDE} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle
              key={a}
              cx={20 + 13.5 * Math.cos((a * Math.PI) / 180)}
              cy={20 + 13.5 * Math.sin((a * Math.PI) / 180)}
              r="1.3"
              fill={GIALLO}
              strokeWidth="0.6"
            />
          ))}
        </g>
      );
    case 'coppe':
      return (
        <g {...st}>
          <path d="M8 7 H32 Q32 21 20 23 Q8 21 8 7 Z" fill={GIALLO} />
          <rect x="8" y="7" width="24" height="3.5" fill={ROSSO} />
          <path d="M13 14 Q20 19 27 14" fill="none" stroke={ROSSO} strokeWidth="1.2" />
          <rect x="18" y="22.5" width="4" height="7" fill={GIALLO} />
          <path d="M10 36 Q20 27 30 36 Z" fill={BLU} />
        </g>
      );
    case 'spade':
      return (
        <g {...st}>
          <path d="M18 3 Q32 13 24 30 L19.5 30 Q26 15 18 3 Z" fill={AZZURRO} />
          <rect x="11" y="29" width="18" height="3.4" rx="1.2" fill={GIALLO} />
          <rect x="18.5" y="32.4" width="3.4" height="4.6" fill={ROSSO} />
          <circle cx="20.2" cy="38" r="1.8" fill={GIALLO} />
        </g>
      );
    case 'bastoni':
      return (
        <g {...st}>
          <path d="M16 37 L18.5 6 Q21 1 24 5.5 L24.5 37 Z" fill={VERDE} />
          <ellipse cx="20.5" cy="12" rx="2.2" ry="1.6" fill={MARRONE} strokeWidth="0.8" />
          <ellipse cx="22.5" cy="20" rx="2.2" ry="1.6" fill={MARRONE} strokeWidth="0.8" />
          <ellipse cx="19.5" cy="27" rx="2.2" ry="1.6" fill={MARRONE} strokeWidth="0.8" />
          <rect x="15.6" y="32" width="9.2" height="3" fill={ROSSO} />
        </g>
      );
  }
}

/** Un simbolo posizionato dentro la carta (coordinate del centro, lato, rotazione) */
function Pip({ s, x, y, size, rot = 0 }: { s: Suit; x: number; y: number; size: number; rot?: number }) {
  const k = size / 40;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k}) translate(-20 -20)`}>
      <PipShape s={s} />
    </g>
  );
}

export function SuitIcon({ s, size = 24 }: { s: Suit; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <PipShape s={s} />
    </svg>
  );
}

// posizioni dei simboli per le carte da 2 a 7 (cornice 100×155)
const LAYOUT: Record<number, [number, number][]> = {
  2: [[50, 48], [50, 108]],
  3: [[50, 38], [50, 78], [50, 118]],
  4: [[34, 50], [66, 50], [34, 106], [66, 106]],
  5: [[34, 46], [66, 46], [50, 78], [34, 110], [66, 110]],
  6: [[34, 40], [66, 40], [34, 78], [66, 78], [34, 116], [66, 116]],
  7: [[34, 40], [66, 40], [50, 59], [34, 78], [66, 78], [34, 116], [66, 116]],
}; // prettier-ignore

function Numerale({ s, v }: { s: Suit; v: number }) {
  if (v === 1) {
    return (
      <g>
        {s === 'denari' && (
          <circle cx="50" cy="78" r="34" fill="none" stroke={ROSSO} strokeWidth="1.5" strokeDasharray="3 3" />
        )}
        <Pip s={s} x={50} y={78} size={56} />
      </g>
    );
  }
  const crossed = s === 'spade' || s === 'bastoni';
  return (
    <g>
      {LAYOUT[v].map(([x, y], i) => (
        <Pip
          key={i}
          s={s}
          x={x}
          y={y}
          size={v <= 3 ? 38 : v <= 5 ? 33 : 28}
          rot={crossed && x !== 50 ? (x < 50 ? -22 : 22) : 0}
        />
      ))}
    </g>
  );
}

function Figura({ s, v }: { s: Suit; v: number }) {
  const robe = ROBE[s];
  const acc = ACCENT[s];
  const st = { stroke: INK, strokeWidth: 1.3, strokeLinejoin: 'round' as const };
  if (v === 10) {
    // Re: corona, barba, mantello lungo
    return (
      <g>
        <g {...st}>
          <path d="M30 62 Q50 54 70 62 L78 132 L22 132 Z" fill={robe} />
          <path d="M30 62 L22 132 L36 132 L42 64 Z" fill={acc} />
          <path d="M70 62 L78 132 L64 132 L58 64 Z" fill={acc} />
          <rect x="34" y="90" width="32" height="5" fill={GIALLO} />
          <path d="M42 60 Q50 66 58 60 L56 66 Q50 70 44 66 Z" fill="#fff" />
          <circle cx="50" cy="47" r="10" fill={PELLE} />
          <path d="M41 50 Q50 64 59 50 Q50 55 41 50 Z" fill={MARRONE} />
          <path d="M39 38 L41 26 L45.5 33 L50 24 L54.5 33 L59 26 L61 38 Z" fill={GIALLO} />
          <path d="M64 68 L76 77 L72 81 L60 73 Z" fill={robe} />
          <rect x="22" y="132" width="56" height="4" fill={MARRONE} />
        </g>
        <circle cx="46" cy="46" r="0.9" fill={INK} />
        <circle cx="54" cy="46" r="0.9" fill={INK} />
        <Pip s={s} x={77} y={70} size={24} />
      </g>
    );
  }
  if (v === 9) {
    // Cavallo: cavaliere a cavallo
    return (
      <g>
        <g {...st}>
          <path d="M78 98 Q92 108 84 124" fill="none" stroke={acc} strokeWidth="4" strokeLinecap="round" />
          {[32, 41, 61, 70].map((x) => (
            <rect key={x} x={x} y="104" width="5.5" height="30" fill="#f5efe3" />
          ))}
          <ellipse cx="54" cy="100" rx="26" ry="13" fill="#f5efe3" />
          <path d="M33 98 L23 74 Q21 64 29 63 L36 66 L42 92 Z" fill="#f5efe3" />
          <path d="M29 63 L31 56 L34 64 Z" fill="#f5efe3" />
          <path d="M33 64 Q40 70 40 86" fill="none" stroke={acc} strokeWidth="3.5" />
          <path d="M44 88 L68 88 L66 106 L46 106 Z" fill={robe} />
          <path d="M46 64 Q55 60 64 64 L66 90 L44 90 Z" fill={robe} />
          <rect x="51" y="88" width="6.5" height="17" fill={acc} />
          <circle cx="55" cy="53" r="8" fill={PELLE} />
          <path d="M46 49 Q55 38 64 49 Z" fill={acc} />
          <path d="M63 70 L74 60 L77 64 L66 74 Z" fill={robe} />
        </g>
        <circle cx="27" cy="68" r="1" fill={INK} />
        <Pip s={s} x={76} y={52} size={22} />
      </g>
    );
  }
  // Fante: giovane in piedi con berretto piumato
  return (
    <g>
      <g {...st}>
        <rect x="38" y="100" width="9" height="30" fill={acc} />
        <rect x="53" y="100" width="9" height="30" fill={acc} />
        <ellipse cx="42" cy="132" rx="7" ry="3" fill={MARRONE} />
        <ellipse cx="58" cy="132" rx="7" ry="3" fill={MARRONE} />
        <path d="M33 62 Q50 55 67 62 L71 102 L29 102 Z" fill={robe} />
        <rect x="31" y="82" width="38" height="4.5" fill={acc} />
        <path d="M43 60 Q50 65 57 60 L55 65 Q50 68 45 65 Z" fill="#fff" />
        <circle cx="50" cy="49" r="9" fill={PELLE} />
        <path d="M37 43 Q50 29 64 41 L66 44 L35 44 Z" fill={acc} />
        <path d="M60 37 Q70 26 76 30 Q68 32 63 40 Z" fill={robe} />
        <path d="M35 66 L25 78 L29 82 L39 72 Z" fill={robe} />
      </g>
      <circle cx="46.5" cy="48.5" r="0.9" fill={INK} />
      <circle cx="53.5" cy="48.5" r="0.9" fill={INK} />
      <Pip s={s} x={24} y={80} size={24} />
    </g>
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
  const base = `relative shrink-0 select-none overflow-hidden rounded-[9%/6%] shadow-[0_2px_6px_rgba(0,0,0,.35)] transition duration-150 ${className}`;
  if (back || !card) {
    return (
      <Tag
        className={`${base} border-2 border-[#fbf7ee] bg-[#1e3a6e]`}
        style={{ width: w, height: h }}
        aria-label="Carta coperta"
      >
        <svg viewBox="0 0 100 155" className="h-full w-full" aria-hidden>
          <defs>
            <pattern id="dorso" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="12" fill="#1e3a6e" />
              <rect width="6" height="6" fill="#2f62ad" />
            </pattern>
          </defs>
          <rect x="6" y="6" width="88" height="143" rx="5" fill="url(#dorso)" stroke="#f2bf2f" strokeWidth="2" />
          <circle cx="50" cy="77.5" r="14" fill="#cf2a27" stroke="#f2bf2f" strokeWidth="2" />
        </svg>
      </Tag>
    );
  }
  const figure = card.v >= 8;
  const num = cardLabel(card);
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={cardName(card)}
      className={`${base} ${selected ? '-translate-y-3 ring-4 ring-white' : ''} ${dim ? 'opacity-45' : ''} ${
        onClick && !disabled ? 'hover:-translate-y-1 active:scale-95' : ''
      }`}
      style={{ width: w, height: h, background: CARTA }}
    >
      <svg viewBox="0 0 100 155" className="h-full w-full" aria-hidden>
        {figure && <rect x="17" y="24" width="66" height="107" rx="3" fill="#fffdf6" stroke={INK} strokeWidth="1" />}
        {figure ? (
          <g transform="translate(50 78) scale(0.86) translate(-50 -80)">
            <Figura s={card.s} v={card.v} />
          </g>
        ) : (
          <Numerale s={card.s} v={card.v} />
        )}
        <text x="9" y="21" fontSize="19" fontWeight="800" fill={INK} fontFamily="Georgia, 'Times New Roman', serif">
          {num}
        </text>
        <text
          x="9"
          y="21"
          fontSize="19"
          fontWeight="800"
          fill={INK}
          fontFamily="Georgia, 'Times New Roman', serif"
          transform="rotate(180 50 77.5)"
        >
          {num}
        </text>
      </svg>
    </Tag>
  );
}
