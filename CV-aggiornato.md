# Daniele Bucca — CV aggiornato

Testo pronto da incollare nel tuo modello. Le modifiche e il perché sono in
fondo, così puoi accettarne alcune e rifiutarne altre.

---

## Daniele Bucca

**Junior Full-Stack Developer**

+39 371 452 2424 · buccadany@gmail.com · Barcellona P.G. (ME), disponibile a trasferirsi
github.com/defnotafantom · vybeshub.art *(progetto live)*

---

### PROFILO

Sviluppatore full-stack autodidatta. Ho progettato e costruito da solo **Vybes**,
una piattaforma a due lati che collega artisti e chi li ingaggia: dall'architettura
del database al deploy in produzione, passando per autenticazione e permessi, chat
in tempo reale, conformità GDPR e DSA, SEO tecnica e una suite di test automatici.

Circa 23.700 righe di TypeScript, **50 decisioni architetturali documentate** con
le alternative scartate, e una classificazione dei difetti che ho trovato usando
il prodotto. Uso strumenti di AI per scrivere più in fretta; l'architettura, le
verifiche e la difesa di ogni scelta sono mie.

---

### PROGETTO IN EVIDENZA — VYBES

*Piattaforma che collega artisti e organizzatori di eventi. Next.js 15 (App Router),
TypeScript, Prisma su PostgreSQL (Neon), Tailwind CSS. In produzione su vybeshub.art.*

- **Decisioni documentate:** 50 ADR con le alternative considerate, i compromessi
  accettati e i casi in cui una decisione ne corregge una precedente. Include un
  documento che classifica i difetti trovati in quattro forme ricorrenti — fra cui
  «il sistema dice di sì e non fa niente» e «la regola esiste e niente la applica»
  — usate poi come metodo di ricerca: cercando una forma sola con qualche riga di
  shell sono emersi sette difetti che nessun test copriva.

- **Architettura e rendering:** pagine pubbliche server-side (SSG/ISR) per prestazioni
  e indicizzazione; sitemap partizionata e metadati generati da un unico modulo
  condiviso (canonical, Open Graph, dati strutturati Schema.org). Un controllo in CI
  verifica che ogni rotta dichiari il proprio canonical.

- **Dominio e regole di prodotto:** sistema di reputazione calcolato da fatti
  verificabili invece che accumulato, con formule distinte per i due lati del
  mercato e tetti per voce che rendono impossibile scalare la classifica ripetendo
  un'azione. Rotazione della vetrina, obiettivi riscuotibili, economia interna con
  registro dei movimenti.

- **Real-time:** chat con Server-Sent Events a doppia sorgente (bus interno +
  polling sul database) per garantire la consegna in ambiente serverless, con
  deduplica lato client.

- **Sicurezza:** sessioni JWT httpOnly (Auth.js), bcrypt costo 12, validazione Zod
  su ogni endpoint, rate limiting per IP e rotta, verifica dei byte reali sui file
  caricati. Scritture concorrenti risolte con compare-and-set e vincoli di unicità
  sul database, non con controlli applicativi.

- **Conformità:** cancellazione ed esportazione dell'account (GDPR art. 17 e 20),
  coda di moderazione con motivazione all'autore del contenuto rimosso (DSA art. 17).

- **Qualità:** 269 test unitari (Vitest) e 47 end-to-end (Playwright) su quattro
  profili di dispositivo, in CI su GitHub Actions insieme a controlli su tipi, lint,
  formato, canonical e variabili CSS. Monitoraggio errori con Sentry.

- **Database:** 24 modelli, 7 migrazioni versionate scritte a mano con backfill dei
  dati, indici composti sulle query più frequenti, pooling e migrazioni su
  connessioni separate.

- **Dipendenze:** 16 in produzione. Raggruppamento dei marker sulla mappa,
  generatore pseudocasuale con seme e logica di gioco scritti a mano, ognuno con
  la motivazione della scelta.

---

### COMPETENZE TECNICHE

- **Frontend:** React, Next.js (App Router), TypeScript, JavaScript (ES6+),
  Tailwind CSS, HTML5/CSS3, responsive e mobile-first, accessibilità (WCAG 2.1 AA,
  `prefers-reduced-motion`, bersagli tattili, contrasti verificati)
- **Backend:** Node.js, API REST, Next.js Route Handlers, Auth.js, Zod,
  concorrenza e transazioni
- **Database:** PostgreSQL, Prisma ORM, progettazione schema e relazioni, indici,
  migrazioni versionate
- **Testing:** Vitest (unit), Playwright (end-to-end, multi-dispositivo)
- **DevOps:** Git/GitHub, GitHub Actions (CI), Vercel, Sentry, Upstash Redis
- **Altro:** SEO tecnica, Server-Sent Events, Leaflet/OpenStreetMap, upload e
  storage file, conformità GDPR e DSA

---

### FORMAZIONE

- **Corso Full-Stack Development** — Epicode (online, 2 mesi)
- **Scienze Informatiche (L-31)** — Università degli Studi di Messina (2019–2020,
  non completato)
- **Diploma Liceo Scientifico "E. Medi"** — Barcellona Pozzo di Gotto (ME)

Formazione continua da documentazione ufficiale e pratica su progetti reali.

---

### LINGUE

- **Italiano:** madrelingua
- **Inglese:** B2

---
---

## Cosa ho cambiato, e perché

### 1. I numeri erano vecchi, e ti sottovendevano

«81 test unitari e 20 end-to-end» → **269 e 47**. Più del triplo. Era il dato più
verificabile del CV ed era quello che ti faceva sembrare meno di quello che sei.

Aggiunti quelli che mancavano e che un tecnico legge volentieri: 23.700 righe,
24 modelli, 7 migrazioni, **16 dipendenze di produzione**. L'ultimo è quello che
fa alzare un sopracciglio in senso buono.

### 2. «Decisioni documentate» è salita al primo posto

Era l'ultimo punto, scritto in modo generico. È **la cosa che ti distingue**, e la
sola che quasi nessun altro candidato porta. Ora è la prima e dice un numero — 50 —
e cita la classificazione dei difetti, che è ancora più rara.

Il dettaglio che vale: *«cercando una forma sola con qualche riga di shell sono
emersi sette difetti che nessun test copriva»*. Racconta un **metodo**, non uno
strumento. È la frase su cui ti faranno la domanda che vuoi ti facciano.

### 3. Aggiunta la conformità GDPR e DSA

Non c'era, ed è lavoro serio: cancellazione ed esportazione dell'account, coda di
moderazione con motivazione all'autore. Molti sviluppatori con anni di esperienza
non ci hanno mai messo mano, e in un'azienda europea è un problema che qualcuno
deve risolvere.

### 4. Aggiunta la concorrenza

*«Scritture concorrenti risolte con compare-and-set e vincoli di unicità sul
database, non con controlli applicativi.»* È una frase che separa chi ha letto
un tutorial da chi ha pensato a cosa succede con due richieste simultanee. Costa
una riga.

### 5. Riscritta la frase sull'AI

Prima: *«Lavoro con l'affiancamento di strumenti AI per accelerare la scrittura
del codice, ma progetto, verifico e sono in grado di spiegare ogni scelta
architetturale in autonomia.»*

Ora: *«Uso strumenti di AI per scrivere più in fretta; l'architettura, le verifiche
e la difesa di ogni scelta sono mie.»*

Stessa sostanza, metà delle parole, e soprattutto senza il **«ma»**. Quel «ma» era
una scusa: segnalava che tu stesso consideri la prima parte un problema. Senza,
diventa una constatazione.

**Sulla scelta di dichiararlo.** Alcune aziende filtreranno. Ti consiglio comunque
di tenerlo, per tre ragioni: nel 2026 lo fanno tutti e non dirlo non è credibile;
un'azienda che scarta un candidato per questo ti scarterebbe comunque dopo una
settimana; e soprattutto **è vero**, e la tua difesa in colloquio funziona solo se
sei coerente. Ma è una tua decisione — la riga si toglie in due secondi.

### 6. Aggiunta l'accessibilità fra le competenze

Nel codice c'è cura vera — `prefers-reduced-motion` rispettato in JS e CSS,
bersagli da 44px, contrasti calcolati sul caso peggiore, WCAG citata dove serve.
Non era scritta da nessuna parte. Attenzione: **prima di dichiararla, mettiamo
`axe` in CI**, così se te lo chiedono hai un numero e non un racconto.

---

## Cosa NON ho scritto, e perché

**«Ho lanciato una piattaforma».** Non ha utenti. La formula usata è «ho progettato
e costruito», che è vera e già molta roba. La differenza la nota chi assume, e
scoprirla dopo costa tutta la credibilità.

**Percentuali di copertura dei test.** Non le abbiamo misurate. Lancia
`npm run test:coverage`: se è un numero decente lo aggiungiamo, se non lo è meglio
tacere che gonfiare.

**La gamification e i minigiochi.** Su un CV per aziende sono un rischio: si
leggono come «ha fatto un giochino». Il valore vero — economia interna con
registro, invariante applicata dal sistema dei tipi, generatore deterministico —
è già coperto dai punti su dominio e concorrenza, in una forma che un tecnico
prende sul serio.
