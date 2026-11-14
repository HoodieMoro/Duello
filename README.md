# Duello · giochi in due

Raccolta di giochi per **due persone**: sullo stesso telefono, oppure **online**, ognuno sul suo telefono.
Si apre dal browser, si può aggiungere alla schermata Home come un'app e non serve nessun account per giocare.

## I giochi

| Gioco | Come si gioca |
|---|---|
| **Air hockey** | Faccia a faccia, tempo reale: ognuno trascina la racchetta nella sua metà. Primo a 5 gol |
| **Riflessi** | Faccia a faccia: tocca appena lo schermo diventa verde. Primo a 3 round |
| **Tiro alla fune** | Faccia a faccia: tocca più veloce dell'altro per portare la corda dalla tua parte |
| **Tris** | Al tavolo, a turni |
| **Quattro in fila** | Al tavolo, a turni: griglia 7×6 |
| **Dama** | Al tavolo, a turni: dama all'italiana (presa obbligatoria, la pedina non mangia la dama) |
| **Punti e linee** | Al tavolo, a turni: chiudi più quadrati |
| **Coppie** | Al tavolo, a turni: memory con 10 coppie |
| **Cinque dadi** | Passa il telefono: 3 lanci per turno, foglio punti a due colonne con anteprima dei punti, bonus +35 a 63, 13 turni |
| **Battaglia navale** | Passa il telefono: flotte nascoste, schermata "non guardare" tra un turno e l'altro |
| **Briscola** | Carte napoletane, 3 in mano, 120 punti |
| **Tressette** | Carte napoletane, obbligo di rispondere al seme, a più mani fino a 21 (senza accusi) |
| **Ultima carta** | Gioco a colori tipo "scarta e resta senza carte", con Salta, +2, Jolly e "Ultima!" |
| **Lettere** | Parole incrociate su griglia 13×13 con caselle bonus; le parole le approva l'avversario (nessun dizionario) |
| **Quiz** | 120 domande in 8 materie, 20 secondi per risposta (domande in `src/games/quiz/domande.ts`) |
| **Il Sondaggio** | Indovina le 6 risposte più comuni; 3 errori e l'altro può rubare (punteggi stimati, in `src/games/sondaggio/domande.ts`) |

Nei giochi "al tavolo" il telefono sta in mezzo: il **Giocatore 1** (rosa) è in basso, il **Giocatore 2** (azzurro)
in alto con le scritte capovolte. Chi inizia si alterna a ogni rivincita.
I nomi e le vittorie restano salvati nel browser del telefono.

**Online** (tutti i giochi a turni; i tre in tempo reale restano sullo stesso telefono perché il ritardo di rete
li falserebbe): uno tocca *Gioca online → Crea una stanza* e manda il link o il codice di 4 lettere,
l'altro lo apre ed entra. Si sceglie il gioco e si apre su entrambi i telefoni; rivincite e punteggio sono condivisi.
Se uno chiude l'app può riaprire lo stesso link e rientra nella partita.

## Il sito

Online su **https://hoodiemoro.github.io/Duello/** (repository `HoodieMoro/Duello`).
Sul telefono: Condividi → *Aggiungi alla schermata Home*.

**Aggiornarlo:** ogni file caricato nel repository viene pubblicato da solo in 1–2 minuti
(workflow `.github/workflows/main.yml`). Si caricano solo i file cambiati, nella stessa cartella in cui
stanno qui: sul sito di GitHub entra nella cartella giusta (es. `src` → `games`) → *Add file → Upload files*.
Non serve ricaricare `node_modules`, `dist` né `.github`.

## Gioco online: collegare Firebase (una volta sola, ~10 minuti)

Le mosse passano da un database **Firebase Realtime Database** (gratuito, piano Spark, senza carta di credito).
Finché non è configurato, il pulsante *Gioca online* mostra un avviso e il resto dell'app funziona normalmente.

1. Vai su **console.firebase.google.com** e accedi con un account Google → **Crea un progetto** (es. `duello`;
   Google Analytics non serve).
2. Nel menu a sinistra: **Build → Realtime Database → Crea database**. Posizione: **Belgio (europe-west1)**.
   Modalità: **bloccata** (le regole le metti al punto 3).
3. Nella scheda **Regole** del database cancella tutto, incolla il contenuto del file `database.rules.json`
   di questo progetto e premi **Pubblica**.
4. Torna alla pagina principale del progetto → icona **Web `</>`** (Aggiungi app) → nome `duello` → **Registra app**.
   Compare un blocco `const firebaseConfig = { ... }`: tienilo aperto.
5. Su GitHub apri il file `src/online/config.ts` del repository → matita (*Edit*) → copia nei campi vuoti
   `apiKey`, `authDomain`, `databaseURL`, `projectId` e `appId` presi dal blocco del punto 4 → **Commit changes**.
6. In 1–2 minuti il sito si ripubblica da solo e *Gioca online* è attivo.

Note:
- I valori di `config.ts` non sono password: servono solo a trovare il database e possono stare in un repository pubblico.
- Con le regole di `database.rules.json` chi conosce il codice di una stanza può leggerla e scriverci:
  va bene per giocare, ma non metteteci dati personali (contiene solo nomi e mosse).
- Il piano gratuito regge 100 telefoni collegati contemporaneamente e 1 GB di dati: per un gioco tra amici è molto più del necessario.
  Le stanze vecchie si possono cancellare dalla console (Realtime Database → Dati → `rooms`).

**Provare l'online senza Firebase (sviluppo):** con `npm run dev` apri
`http://127.0.0.1:5175/?backend=locale#/online` in due schede dello stesso browser: ogni scheda fa da "telefono"
e un finto database nel browser le collega.

## Aggiungere un gioco

Ogni gioco è un componente in `src/games/` che riceve `starter`, `names`, `onTurn(side)` e `onEnd(risultato)`.
I giochi a turni tengono tutto lo stato della partita in `useShared` (`src/online/shared.ts`): sullo stesso telefono
è uno stato normale, online lo stesso stato viene sincronizzato fra i due telefoni. Le mosse sono funzioni pure
(stato precedente → nuovo stato) e `useCanAct(turno)` dice se questo telefono può muovere.
Si registra in `src/games/index.ts` con nome, regole, icona e modalità:

- `table` – a turni, telefono in mezzo al tavolo
- `turns` – a turni, ci si passa il telefono
- `live` – tempo reale, schermo diviso a metà

La schermata di gioco (`src/pages/GameScreen.tsx`) si occupa di turno evidenziato, regole, risultato,
rivincita e conteggio delle vittorie.

## Sviluppo in locale

```bash
./avvia.command        # oppure: npm install && npm run dev  →  http://127.0.0.1:5175
```

Build di produzione: `npm run build` → cartella `dist/` (sito statico).
