/**
 * Domande de "Il Sondaggio": le risposte più comuni con un punteggio.
 * I punteggi sono STIME fatte da noi, non vengono da un sondaggio reale.
 * Formato risposta: [risposta mostrata, punti, ...altri modi di dirla]
 */
export type Risposta = [string, number, ...string[]];
export type DomandaSondaggio = [string, Risposta[]];

import { CASA } from './domande-casa';
import { CIBO } from './domande-cibo';
import { SCUOLA_LAVORO } from './domande-scuola-lavoro';
import { SVAGO } from './domande-svago';

const VARIE: DomandaSondaggio[] = [
  [
    'Qualcosa che si porta in spiaggia',
    [
      ['Asciugamano', 30, 'telo', 'telo mare', 'telo da mare'],
      ['Ombrellone', 22],
      ['Crema solare', 18, 'crema', 'protezione', 'solare', 'abbronzante'],
      ['Costume', 12, 'costume da bagno'],
      ['Occhiali da sole', 8, 'occhiali'],
      ['Pallone', 5, 'palla'],
    ],
  ],
  [
    'Un ingrediente della pizza',
    [
      ['Mozzarella', 34],
      ['Pomodoro', 28, 'salsa', 'sugo', 'passata', 'pomodori'],
      ['Farina', 12, 'impasto'],
      ['Basilico', 10],
      ['Olio', 7, 'olio d oliva'],
      ['Lievito', 5],
    ],
  ],
  [
    'Un animale domestico',
    [
      ['Cane', 38],
      ['Gatto', 30],
      ['Pesce rosso', 10, 'pesce', 'pesci'],
      ['Coniglio', 8],
      ['Criceto', 6],
      ['Pappagallo', 4, 'uccellino', 'canarino', 'uccello'],
    ],
  ],
  [
    'Una cosa che si fa appena svegli',
    [
      ['Lavarsi i denti', 26, 'denti', 'spazzolino'],
      ['Fare colazione', 22, 'colazione', 'mangiare'],
      ['Bere il caffè', 18, 'caffe', 'caffè'],
      ['Guardare il telefono', 14, 'telefono', 'cellulare', 'social'],
      ['Andare in bagno', 10, 'bagno', 'pipi'],
      ['Fare la doccia', 6, 'doccia'],
    ],
  ],
  [
    'Un frutto rosso',
    [
      ['Fragola', 34],
      ['Ciliegia', 24],
      ['Mela', 16],
      ['Lampone', 10],
      ['Anguria', 8, 'cocomero'],
      ['Melagrana', 5, 'melograno'],
    ],
  ],
  [
    'Qualcosa che si trova in cucina',
    [
      ['Frigorifero', 28, 'frigo'],
      ['Forno', 20],
      ['Pentola', 16, 'pentole', 'padella'],
      ['Fornelli', 12, 'piano cottura', 'fornello'],
      ['Lavandino', 9, 'lavello'],
      ['Tavolo', 7],
    ],
  ],
  [
    'Uno sport che si guarda in TV',
    [
      ['Calcio', 46, 'partita'],
      ['Tennis', 16],
      ['Formula 1', 14, 'f1', 'automobilismo'],
      ['Ciclismo', 8, 'giro d italia'],
      ['Basket', 6, 'pallacanestro'],
      ['MotoGP', 5, 'moto gp', 'moto', 'motociclismo'],
    ],
  ],
  [
    'Un motivo per arrivare in ritardo',
    [
      ['Traffico', 34, 'coda', 'ingorgo'],
      ['La sveglia non ha suonato', 24, 'sveglia', 'dormito', 'mi sono addormentato'],
      ['Treno o bus in ritardo', 14, 'treno', 'autobus', 'bus', 'mezzi'],
      ['Parcheggio', 10],
      ['Pioggia', 6, 'maltempo'],
      ['Chiavi perse', 5, 'chiavi', 'ho perso le chiavi'],
    ],
  ],
  [
    'Qualcosa che si mette in valigia',
    [
      ['Vestiti', 30, 'maglie', 'magliette', 'abiti'],
      ['Spazzolino', 18, 'dentifricio'],
      ['Mutande', 16, 'intimo', 'biancheria'],
      ['Scarpe', 12],
      ['Pigiama', 9],
      ['Caricabatterie', 7, 'caricatore'],
    ],
  ],
  [
    'Un regalo per San Valentino',
    [
      ['Fiori', 34, 'rose', 'rosa', 'mazzo di fiori'],
      ['Cioccolatini', 26, 'cioccolato', 'cioccolata'],
      ['Gioiello', 14, 'collana', 'anello', 'braccialetto'],
      ['Cena romantica', 10, 'cena', 'ristorante'],
      ['Peluche', 7, 'orsacchiotto'],
      ['Bigliettino', 5, 'biglietto', 'lettera'],
    ],
  ],
  [
    'Qualcosa che fa paura ai bambini',
    [
      ['Il buio', 36, 'buio'],
      ['I mostri', 18, 'mostro', 'mostri', 'uomo nero'],
      ['Il dottore', 12, 'dottore', 'medico', 'puntura', 'iniezione'],
      ['I ragni', 10, 'ragno'],
      ['I temporali', 9, 'temporale', 'tuoni', 'fulmini'],
      ['I clown', 6, 'clown', 'pagliacci', 'pagliaccio'],
    ],
  ],
  [
    'Un mezzo di trasporto',
    [
      ['Auto', 36, 'macchina', 'automobile'],
      ['Treno', 18],
      ['Aereo', 14],
      ['Bicicletta', 12, 'bici'],
      ['Autobus', 9, 'bus', 'pullman'],
      ['Moto', 6, 'motorino', 'scooter', 'motocicletta'],
    ],
  ],
  [
    'Una cosa che si fa a Natale',
    [
      ["Fare l'albero", 26, 'albero', 'addobbi', 'decorazioni'],
      ['Scambiarsi i regali', 24, 'regali', 'regalo'],
      ['Il pranzo in famiglia', 20, 'pranzo', 'cenone', 'mangiare'],
      ['Il presepe', 10, 'presepe', 'presepio'],
      ['Andare a messa', 8, 'messa', 'chiesa'],
      ['Giocare a tombola', 6, 'tombola', 'carte'],
    ],
  ],
  [
    'Un piatto tipico italiano',
    [
      ['Pizza', 30],
      ['Lasagne', 18, 'lasagna'],
      ['Carbonara', 16, 'spaghetti alla carbonara'],
      ['Risotto', 12],
      ['Tiramisù', 9, 'tiramisu'],
      ['Parmigiana', 6, 'melanzane alla parmigiana'],
    ],
  ],
  [
    'Qualcosa che si trova in un ufficio',
    [
      ['Computer', 30, 'pc'],
      ['Scrivania', 22],
      ['Sedia', 14],
      ['Stampante', 12],
      ['Telefono', 9],
      ['Penna', 7, 'penne', 'matita'],
    ],
  ],
  [
    'Una parola che si dice al telefono',
    [
      ['Pronto', 50],
      ['Ciao', 18],
      ['Chi parla?', 10, 'chi parla', 'chi e'],
      ['Sì', 8, 'si'],
      ['Ci sentiamo', 6, 'a dopo', 'arrivederci'],
      ['Scusi', 4, 'mi scusi'],
    ],
  ],
  [
    'Un insetto',
    [
      ['Zanzara', 34],
      ['Mosca', 22],
      ['Formica', 16],
      ['Ape', 12],
      ['Farfalla', 8],
      ['Coccinella', 5],
    ],
  ],
  [
    'Qualcosa che si ordina al bar',
    [
      ['Caffè', 46, 'caffe', 'espresso'],
      ['Cornetto', 22, 'brioche', 'croissant'],
      ['Cappuccino', 12],
      ['Spremuta', 6, 'succo'],
      ['Acqua', 5],
      ['Tramezzino', 4, 'panino'],
    ],
  ],
  [
    'Un lavoro che si sogna da bambini',
    [
      ['Calciatore', 26],
      ['Astronauta', 18],
      ['Veterinario', 14],
      ['Pompiere', 12, 'vigile del fuoco'],
      ['Maestra', 10, 'maestro', 'insegnante'],
      ['Medico', 8, 'dottore'],
    ],
  ],
  [
    'Qualcosa che si fa in vacanza',
    [
      ['Dormire', 24, 'riposare'],
      ['Andare al mare', 20, 'mare', 'spiaggia', 'nuotare'],
      ['Mangiare', 18],
      ['Visitare città e musei', 14, 'visitare', 'musei', 'turismo'],
      ['Fare foto', 10, 'foto', 'fotografie'],
      ['Leggere', 6, 'libro'],
    ],
  ],
  [
    'Un oggetto che si dimentica spesso',
    [
      ['Chiavi', 38],
      ['Telefono', 22, 'cellulare'],
      ['Ombrello', 14],
      ['Occhiali', 10],
      ['Portafoglio', 8],
      ['Caricabatterie', 4, 'caricatore'],
    ],
  ],
  [
    'Una cosa che si fa la domenica',
    [
      ['Dormire fino a tardi', 30, 'dormire', 'riposare'],
      ['Pranzo in famiglia', 26, 'pranzo', 'pranzare', 'mangiare'],
      ['Guardare la partita', 14, 'partita', 'calcio'],
      ['Andare a messa', 10, 'messa', 'chiesa'],
      ['Fare una passeggiata', 8, 'passeggiata', 'passeggiare', 'camminare'],
      ['Andare dai nonni', 6, 'nonni'],
    ],
  ],
  [
    'Qualcosa di giallo',
    [
      ['Sole', 30],
      ['Banana', 22],
      ['Limone', 18],
      ['Pulcino', 10],
      ['Girasole', 8],
      ['Taxi', 4],
    ],
  ],
  [
    'Un’app per chattare o un social',
    [
      ['WhatsApp', 34, 'whatsapp', 'whats app'],
      ['Instagram', 26, 'insta'],
      ['TikTok', 16, 'tik tok'],
      ['Facebook', 12],
      ['Telegram', 6],
      ['YouTube', 4],
    ],
  ],
  [
    'Una cosa che non può mancare a una festa di compleanno',
    [
      ['Torta', 44],
      ['Candeline', 18, 'candele'],
      ['Regali', 12, 'regalo'],
      ['Palloncini', 10],
      ['Musica', 7],
      ['Amici', 5, 'invitati'],
    ],
  ],
  [
    'Un elettrodomestico',
    [
      ['Lavatrice', 30],
      ['Frigorifero', 24, 'frigo'],
      ['Lavastoviglie', 14],
      ['Forno', 12, 'microonde'],
      ['Aspirapolvere', 9],
      ['Phon', 6, 'fon', 'asciugacapelli'],
    ],
  ],
  [
    'Qualcosa che si fa quando piove',
    [
      ["Aprire l'ombrello", 30, 'ombrello'],
      ['Stare a casa', 26, 'casa', 'restare a casa'],
      ['Guardare un film', 16, 'film', 'tv', 'serie'],
      ['Dormire', 10],
      ['Leggere', 7],
      ['Saltare nelle pozzanghere', 5, 'pozzanghere'],
    ],
  ],
  [
    'Un personaggio delle fiabe',
    [
      ['Cappuccetto Rosso', 30],
      ['Cenerentola', 22],
      ['Biancaneve', 16],
      ['Pinocchio', 14],
      ['Il lupo', 8, 'lupo', 'lupo cattivo'],
      ['Peter Pan', 5],
    ],
  ],
  [
    'Una verdura',
    [
      ['Carota', 26],
      ['Zucchina', 20],
      ['Pomodoro', 16],
      ['Insalata', 14, 'lattuga'],
      ['Melanzana', 10],
      ['Spinaci', 8],
    ],
  ],
  [
    'Un posto dove andare il sabato sera',
    [
      ['Pizzeria', 28, 'pizza'],
      ['Discoteca', 22],
      ['Cinema', 18],
      ['Pub', 14, 'birreria', 'bar'],
      ['Ristorante', 9],
      ['A casa di amici', 5, 'amici'],
    ],
  ],
  [
    'Qualcosa che si trova in un astuccio',
    [
      ['Penna', 32, 'penne', 'biro'],
      ['Matita', 22],
      ['Gomma', 16],
      ['Temperino', 12],
      ['Righello', 8],
      ['Pennarelli', 6, 'pennarello', 'colori'],
    ],
  ],
  [
    'Una scusa per non andare a scuola',
    [
      ['Mal di pancia', 34, 'pancia'],
      ['Febbre', 26],
      ['Mal di testa', 14, 'testa'],
      ['Sciopero', 10],
      ["Ho perso l'autobus", 8, 'autobus', 'bus'],
      ['La neve', 4, 'neve'],
    ],
  ],
  [
    'Qualcosa da spalmare sul pane',
    [
      ['Nutella', 26, 'crema di nocciole', 'cioccolata'],
      ['Burro', 22],
      ['Marmellata', 18, 'confettura'],
      ['Maionese', 12],
      ['Olio', 9],
      ['Formaggio spalmabile', 6, 'formaggio', 'stracchino'],
    ],
  ],
  [
    'Un gioco da tavolo o di società',
    [
      ['Monopoli', 30, 'monopoly'],
      ['Tombola', 22],
      ['Carte', 16, 'briscola', 'scopa'],
      ['Scacchi', 12],
      ['Risiko', 9],
      ['Dama', 6],
    ],
  ],
  [
    'Qualcosa che si fa in palestra',
    [
      ['Correre sul tapis roulant', 26, 'tapis roulant', 'correre', 'tapis'],
      ['Pesi', 24, 'sollevare pesi', 'bilanciere'],
      ['Addominali', 18],
      ['Cyclette', 12, 'bici', 'spinning'],
      ['Stretching', 9],
      ['Flessioni', 6, 'piegamenti'],
    ],
  ],
  [
    'Un colore che si vede spesso nelle bandiere',
    [
      ['Rosso', 32],
      ['Bianco', 26],
      ['Blu', 16],
      ['Verde', 12],
      ['Giallo', 8],
      ['Nero', 4],
    ],
  ],
];

/** Tutte le domande (una domanda con lo stesso testo compare una volta sola). */
export const DOMANDE: DomandaSondaggio[] = [...VARIE, ...CASA, ...CIBO, ...SCUOLA_LAVORO, ...SVAGO].filter(
  (d, i, all) => all.findIndex((x) => x[0].toLowerCase() === d[0].toLowerCase()) === i,
);
