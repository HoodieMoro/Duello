import { Anchor, CircleDot, Crown, Dices, Disc, Grid2x2, Hash, Layers, MoveVertical, Zap } from 'lucide-react';
import type { GameDef, GameMode } from './types';
import Tris from './Tris';
import QuattroInFila from './QuattroInFila';
import Dama from './Dama';
import PuntiLinee from './PuntiLinee';
import Coppie from './Coppie';
import BattagliaNavale from './BattagliaNavale';
import CinqueDadi from './CinqueDadi';
import Riflessi from './Riflessi';
import TiroFune from './TiroFune';
import AirHockey from './AirHockey';

export const GAMES: GameDef[] = [
  {
    id: 'air-hockey',
    name: 'Air hockey',
    tagline: 'Disco, racchette e riflessi',
    mode: 'live',
    icon: Disc,
    tint: 'from-sky-500/30 to-rose-500/30',
    component: AirHockey,
    rules: [
      'Ognuno muove la sua racchetta trascinando il dito nella propria metà campo.',
      'Manda il disco nella porta avversaria, sul lato corto dello schermo.',
      'Vince chi arriva per primo a 5 gol.',
    ],
  },
  {
    id: 'riflessi',
    name: 'Riflessi',
    tagline: 'Chi tocca prima quando diventa verde',
    mode: 'live',
    icon: Zap,
    tint: 'from-amber-400/30 to-emerald-400/30',
    component: Riflessi,
    rules: [
      'Lo schermo diventa giallo: aspettate.',
      'Quando diventa verde, tocca la tua metà il più in fretta possibile.',
      'Chi tocca prima del verde regala il punto all’altro.',
      'Vince chi arriva a 3 round.',
    ],
  },
  {
    id: 'tiro-fune',
    name: 'Tiro alla fune',
    tagline: 'Tocca più veloce per conquistare lo schermo',
    mode: 'live',
    icon: MoveVertical,
    tint: 'from-rose-500/30 to-amber-400/30',
    component: TiroFune,
    rules: [
      'Dopo il conto alla rovescia, tocca la tua metà schermo più veloce che puoi.',
      'Ogni tocco tira la corda verso di te.',
      'Vince chi porta la corda fino al bordo avversario.',
    ],
  },
  {
    id: 'tris',
    name: 'Tris',
    tagline: 'Tre in fila sulla griglia 3×3',
    mode: 'table',
    icon: Hash,
    tint: 'from-rose-500/30 to-fuchsia-500/20',
    component: Tris,
    rules: [
      'A turno mettete il vostro segno in una casella libera.',
      'Vince chi allinea tre segni in orizzontale, verticale o diagonale.',
      'Griglia piena senza tris: pareggio.',
    ],
  },
  {
    id: 'quattro-in-fila',
    name: 'Quattro in fila',
    tagline: 'Fai cadere le pedine e allinea quattro',
    mode: 'table',
    icon: CircleDot,
    tint: 'from-sky-500/30 to-indigo-500/20',
    component: QuattroInFila,
    rules: [
      'A turno toccate una colonna: la pedina cade nella posizione più bassa libera.',
      'Vince chi allinea quattro pedine in orizzontale, verticale o diagonale.',
      'Griglia piena senza vincitori: pareggio.',
    ],
  },
  {
    id: 'dama',
    name: 'Dama',
    tagline: 'Dama all’italiana sulla scacchiera 8×8',
    mode: 'table',
    icon: Crown,
    tint: 'from-amber-500/25 to-rose-500/25',
    component: Dama,
    rules: [
      'Si gioca sulle caselle scure. Tocca una pedina e poi la casella dove spostarla.',
      'Le pedine avanzano di una casella in diagonale e mangiano solo in avanti, saltando un pezzo avversario.',
      'Mangiare è obbligatorio: le pedine che devono farlo lampeggiano. Le prese multiple continuano con la stessa pedina.',
      'Arrivata in fondo, la pedina diventa dama: si muove e mangia anche all’indietro. Le pedine semplici non possono mangiare le dame.',
      'Perde chi resta senza pezzi o senza mosse.',
    ],
  },
  {
    id: 'punti-linee',
    name: 'Punti e linee',
    tagline: 'Chiudi più quadrati dell’avversario',
    mode: 'table',
    icon: Grid2x2,
    tint: 'from-emerald-500/25 to-sky-500/25',
    component: PuntiLinee,
    rules: [
      'A turno tracciate una linea tra due punti vicini.',
      'Chi chiude il quarto lato di un quadrato lo conquista e gioca di nuovo.',
      'Quando tutti i quadrati sono chiusi vince chi ne ha di più.',
    ],
  },
  {
    id: 'coppie',
    name: 'Coppie',
    tagline: 'Gioco di memoria con le carte coperte',
    mode: 'table',
    icon: Layers,
    tint: 'from-fuchsia-500/25 to-amber-400/25',
    component: Coppie,
    rules: [
      'A turno scoprite due carte.',
      'Se sono uguali le tenete e giocate ancora; se no si ricoprono e tocca all’altro.',
      'Vince chi trova più coppie.',
    ],
  },
  {
    id: 'cinque-dadi',
    name: 'Cinque dadi',
    tagline: 'Combinazioni di dadi e foglio punti',
    mode: 'turns',
    icon: Dices,
    tint: 'from-emerald-500/30 to-amber-400/25',
    component: CinqueDadi,
    rules: [
      'Ogni turno hai fino a 3 lanci. Dopo ogni lancio tocca i dadi che vuoi tenere.',
      'Poi scegli una casella libera del foglio: vedi in anteprima quanti punti varrebbe. Ogni casella si usa una volta sola; se non hai la combinazione segni 0.',
      'Sezione alta (Uno–Sei): somma dei dadi di quel valore. Con almeno 63 punti ottieni +35 di bonus.',
      'Tris e Poker: somma di tutti i dadi. Full 25, Scala corta (4 in fila) 30, Scala lunga (5 in fila) 40, Cinquina (5 uguali) 50, Chance: somma dei dadi.',
      'Ogni Cinquina dopo la prima segnata a 50 vale +100 e fa da jolly per Full e Scale.',
      'Dopo 13 turni a testa vince chi ha il totale più alto.',
    ],
  },
  {
    id: 'battaglia-navale',
    name: 'Battaglia navale',
    tagline: 'Affonda la flotta nascosta',
    mode: 'turns',
    icon: Anchor,
    tint: 'from-sky-500/30 to-cyan-400/20',
    component: BattagliaNavale,
    rules: [
      'Ognuno riceve una flotta disposta a caso (puoi rimescolarla): 1 nave da 4, 2 da 3, 2 da 2. Le navi non si toccano.',
      'A turno spara su una casella della griglia avversaria. Se colpisci, spari ancora.',
      'Quando sbagli passa il telefono all’altro, senza sbirciare!',
      'Vince chi affonda per primo tutta la flotta nemica.',
    ],
  },
];

export const MODE_INFO: Record<GameMode, { title: string; hint: string }> = {
  live: { title: 'Faccia a faccia', hint: 'Insieme, in tempo reale, ognuno sulla sua metà schermo' },
  table: { title: 'Al tavolo', hint: 'Telefono in mezzo, a turni' },
  turns: { title: 'Passa il telefono', hint: 'A turni, ci si passa il telefono' },
};

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** a distanza il ritardo di rete falserebbe i giochi in tempo reale */
export const ONLINE_GAMES = GAMES.filter((g) => g.mode !== 'live');
