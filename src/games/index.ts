import {
  Anchor,
  Brain,
  CircleDot,
  Club,
  Crown,
  Dices,
  Disc,
  Grid2x2,
  Hash,
  Layers,
  MessagesSquare,
  MoveVertical,
  SpellCheck,
  Swords,
  WalletCards,
  Zap,
} from 'lucide-react';
import type { GameDef, SectionId } from './types';
import { Briscola, Tressette } from './CarteItaliane';
import UltimaCarta from './UltimaCarta';
import Lettere from './Lettere';
import Quiz from './quiz/Quiz';
import Sondaggio from './sondaggio/Sondaggio';
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
  {
    id: 'briscola',
    name: 'Briscola',
    tagline: 'Il classico con le carte napoletane',
    mode: 'turns',
    section: 'carte',
    icon: Swords,
    tint: 'from-amber-500/30 to-rose-600/25',
    component: Briscola,
    rules: [
      'Mazzo da 40 carte: 3 carte a testa, la carta scoperta sotto il mazzo indica il seme di briscola.',
      'A turno si gioca una carta, senza obbligo di rispondere al seme. Prende la briscola più alta; se non ci sono briscole, la carta più alta del seme giocato per primo.',
      'Ordine di forza: Asso, 3, Re, Cavallo, Fante, 7, 6, 5, 4, 2.',
      'Chi prende pesca per primo e gioca la mano successiva.',
      'Punti: Asso 11, 3 10, Re 4, Cavallo 3, Fante 2. Su 120 punti vince chi ne fa più di 60 (60 a 60 è pareggio).',
    ],
  },
  {
    id: 'tressette',
    name: 'Tressette',
    tagline: 'Rispondi al seme, il 3 è la carta più forte',
    mode: 'turns',
    section: 'carte',
    icon: Club,
    tint: 'from-emerald-500/30 to-amber-500/25',
    component: Tressette,
    rules: [
      'Versione a due: 10 carte a testa, le altre restano nel mazzo. Non c’è briscola.',
      'Si deve rispondere al seme giocato per primo, se lo si ha. Prende la carta più alta di quel seme.',
      'Ordine di forza: 3, 2, Asso, Re, Cavallo, Fante, 7, 6, 5, 4.',
      'Dopo ogni presa si pesca una carta a testa (prima chi ha preso) e le carte pescate si vedono.',
      'Punti: l’Asso vale 1 punto; 2, 3 e figure valgono 1/3; l’ultima presa vale 1 punto. Si contano i punti interi.',
      'Si giocano più mani: vince chi arriva per primo a 21. (Versione senza accusi.)',
    ],
  },
  {
    id: 'ultima-carta',
    name: 'Ultima carta',
    tagline: 'Scarta per colore o numero, resta senza carte',
    mode: 'turns',
    section: 'carte',
    icon: WalletCards,
    tint: 'from-rose-500/30 to-sky-500/30',
    component: UltimaCarta,
    rules: [
      '7 carte a testa. Si gioca una carta dello stesso colore o dello stesso numero/simbolo di quella in cima.',
      'Se non puoi o non vuoi, pesca una carta: poi puoi giocare o passare.',
      'Salta e Inverti: l’avversario salta il turno. +2: l’avversario pesca 2 carte e salta il turno.',
      'Jolly: scegli il nuovo colore. Jolly +4: scegli il colore e l’avversario pesca 4 carte e salta il turno.',
      'Quando hai 2 carte premi “Ultima!” prima di giocare: se resti con una carta senza averlo detto, ne peschi 2.',
      'Vince chi finisce per primo le carte.',
    ],
  },
  {
    id: 'lettere',
    name: 'Lettere',
    tagline: 'Parole incrociate con le lettere del leggio',
    mode: 'turns',
    section: 'parole',
    icon: SpellCheck,
    tint: 'from-amber-300/30 to-orange-500/25',
    component: Lettere,
    rules: [
      'Ognuno ha 7 lettere. A turno componi una parola sulla griglia, in orizzontale o in verticale.',
      'La prima parola passa dalla stella ★; le altre devono incrociare o toccare quelle già presenti.',
      'Tocca una lettera del leggio e poi una casella; tocca di nuovo la lettera sulla griglia per riprenderla.',
      'Caselle bonus: 2L e 3L raddoppiano o triplicano la lettera, 2P e 3P la parola. Usare tutte e 7 le lettere vale 30 punti in più.',
      'Non c’è un dizionario: l’avversario accetta o contesta le parole. Se le contesta, perdi il turno.',
      'Puoi anche cambiare lettere o passare. La partita finisce quando il sacchetto è vuoto e qualcuno finisce le lettere, o dopo 4 turni di fila senza punti. Le lettere rimaste si sottraggono.',
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz',
    tagline: 'Domande a scelta su 8 materie',
    mode: 'turns',
    section: 'parole',
    icon: Brain,
    tint: 'from-violet-500/30 to-sky-500/25',
    component: Quiz,
    rules: [
      'Scegliete le materie (cultura generale, storia, geografia, scienze, matematica, italiano, arte e musica, sport) e quante domande a testa.',
      'A turno rispondete a una domanda con 4 risposte possibili: avete 20 secondi.',
      'Ogni risposta giusta vale 1 punto. Vince chi ne fa di più.',
    ],
  },
  {
    id: 'sondaggio',
    name: 'Il Sondaggio',
    tagline: 'Indovina le risposte più comuni',
    mode: 'turns',
    section: 'parole',
    icon: MessagesSquare,
    tint: 'from-indigo-500/30 to-fuchsia-500/25',
    component: Sondaggio,
    rules: [
      'In ogni round c’è una domanda, per esempio “Un animale domestico”, e un tabellone con le 6 risposte più comuni, ognuna con un punteggio.',
      'Chi apre il round scrive una risposta alla volta: se è nel tabellone si scopre e i punti vanno nel piatto.',
      'Dopo 3 risposte sbagliate l’avversario ha un solo tentativo per rubare: se indovina, prende tutto il piatto.',
      'Se scopri tutte le risposte, il piatto è tuo. Si giocano 4 round, chi apre si alterna.',
      'Le risposte e i punteggi sono stime nostre, non i risultati di un sondaggio reale.',
    ],
  },
];

export const SECTIONS: { id: SectionId; title: string; hint: string }[] = [
  { id: 'live', title: 'Faccia a faccia', hint: 'Insieme, in tempo reale, ognuno sulla sua metà schermo' },
  { id: 'table', title: 'Al tavolo', hint: 'Telefono in mezzo, a turni' },
  { id: 'carte', title: 'Carte', hint: 'Le carte in mano restano segrete: ci si passa il telefono, o si gioca online' },
  { id: 'parole', title: 'Parole e quiz', hint: 'A turni: si scrive, si risponde, si indovina' },
  { id: 'turns', title: 'Passa il telefono', hint: 'A turni, ci si passa il telefono' },
];

export const sectionOf = (g: GameDef): SectionId => g.section ?? g.mode;

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** a distanza il ritardo di rete falserebbe i giochi in tempo reale */
export const ONLINE_GAMES = GAMES.filter((g) => g.mode !== 'live');
