<p align="center"><img src="assets/logo.svg" alt="VolleyHub" width="360"></p>

<p align="center"><strong>Il torneo di pallavolo, dal primo girone al podio.</strong><br>
Iscrizioni online, gironi automatici, segnapunti dal telefono, classifiche live per il pubblico.</p>

<p align="center"><a href="https://gdr-sys.github.io/VolleyHub/">Sito</a> · <a href="https://gdr-sys.github.io/VolleyHub/app.html?demo=1">Prova la demo</a></p>

---

## Cosa fa

**Prima del torneo**
- Procedura guidata: nome, data, luogo, categorie (con colore) e regole di gioco.
- Società con logo, squadre e atleti per categoria, referenti (visibili solo all'organizzatore).
- Modulo di iscrizione online da condividere con un link: le richieste arrivano da approvare.
- Gironi creati in automatico in base ai campi disponibili, separando le squadre della stessa società. Nomi di fantasia o nome della società.

**Durante il torneo**
- Punteggi inseriti direttamente sulla scheda della partita, con 1, 2 o 3 set.
- **Link segnapunti** per ogni partita (QR, WhatsApp): punto per punto in diretta o risultato finale, cronometro facoltativo, schermo sempre acceso.
- Pagina pubblica live: classifiche, partite, tabellone, "in campo ora", squadre preferite, info, menu del bar, sponsor.
- Modalità schermo per TV e proiettori: le classifiche scorrono da sole con il QR per il pubblico.
- Funziona anche con connessione instabile: le modifiche si salvano appena torna la rete.

**Dopo i gironi**
- Fase successiva: tabellone a eliminazione (2, 4, 8, 16 squadre, finale 3° posto), nuovi gironi a serpentina, o entrambi. L'ordine di partenza si può correggere a mano.
- Classifica avulsa tra gironi, statistiche, storico risultati.
- Stampa (o PDF) di classifiche e risultati, volantino con QR.
- Backup e importazione; un torneo si può riusare come modello per l'anno dopo.

### Punteggio in classifica configurabile

Ogni torneo sceglie come assegnare i punti, e ogni categoria può avere regole proprie:

| Formula | Punti |
|---|---|
| **1 punto per set vinto** (predefinita) | 1 per ogni set vinto |
| 3 alla vittoria, 1 al pareggio | 3 / 1 / 0 |
| 2 alla vittoria, 1 al pareggio | 2 / 1 / 0 |
| 1 per set vinto + 1 alla vittoria | set vinti + bonus |
| Personalizzata | punti per set, vittoria, pareggio, sconfitta a scelta |

A parità di punti contano differenza set, differenza punti e punti fatti. Cambiando le regole la classifica si ricalcola subito, anche per le partite già giocate.

## Pagine

| Pagina | A cosa serve |
|---|---|
| `index.html` | Presentazione |
| `accedi.html` | Accesso organizzatori |
| `app.html` | Gestione dei tornei (aggiungi `?demo=1` per la demo nel browser) |
| `live.html?t=…` | Pagina pubblica (aggiungi `&schermo=1` per la modalità TV) |
| `segna.html?t=…&m=…&k=…` | Segnapunti di una partita (link generato dall'app) |
| `iscrizione.html?t=…` | Modulo di iscrizione delle società |
| `stampa.html?t=…` | Classifiche stampabili (`&tipo=volantino` per il QR) |

## Configurazione di Firebase

VolleyHub usa lo stesso progetto Firebase della vecchia app (`torneo-pallavolo-manager`): gli account esistenti funzionano senza cambiare nulla. I dati vivono in una collezione nuova (`vh_tornei`), quindi la vecchia app continua a funzionare.

Servono tre passaggi, una volta sola, dalla [console Firebase](https://console.firebase.google.com/):

1. **Regole Firestore** (Firestore Database → Regole): copia il blocco "VolleyHub" di [`firestore.rules`](firestore.rules) dentro le regole esistenti e pubblica.
2. **Accesso anonimo** (Authentication → Metodo di accesso → Anonimo → Abilita): serve ai segnapunti, che entrano senza account solo con il link della loro partita.
3. **Dominio autorizzato** (Authentication → Impostazioni → Domini autorizzati): verifica che ci sia `gdr-sys.github.io`.

Per abilitare un nuovo organizzatore: crea l'utente in Authentication e il documento `utenti/{uid}` con il campo `attivo: true`.

### Sicurezza dei dati
- Ogni torneo è un documento a sé: niente limite di spazio condiviso fra tornei.
- Risultati, immagini e iscrizioni sono in documenti separati: segnapunti e organizzatore non si sovrascrivono a vicenda.
- Il segnapunti può scrivere **solo** il risultato della propria partita, verificato dalle regole tramite un token segreto.
- Contatti dei referenti e token sono in un documento privato, leggibile solo dall'organizzatore.

## Dalla vecchia app

Esporta i tornei dalla vecchia app (pulsante Esporta) e in VolleyHub usa **Importa**: società, gironi, risultati, tabelloni, menu, sponsor e info vengono convertiti.

## Sviluppo

Sito statico, nessuna compilazione: HTML, CSS e moduli JavaScript. Per provarlo in locale serve un server qualsiasi (i moduli non funzionano da `file://`):

```bash
npx serve .
# poi apri http://localhost:3000/app.html?demo=1
```

- `js/core.js`: logica di dominio (punteggi, classifiche, calendari, tabelloni), condivisa da tutte le pagine.
- `js/store.js`: accesso a Firebase; `js/store-demo.js` stessa interfaccia sul browser.
- `js/app/`: viste dell'app di gestione.

---

Progetto e idea di [Noemi Marcolini](mailto:noemi.marcolini@gmail.com).
