# Ordine di lavoro

Cosa resta da fare, in ordine di urgenza. Ogni voce dice **perché** viene prima
delle altre, e cosa succede se la si salta.

Aggiornato al 2 agosto 2026. Produzione in linea su `vybeshub.art`, salute
verde. Scelta di apertura: **registrazioni aperte a chiunque**.

---

## Cosa cambia con le registrazioni aperte

Le prime voci di questo elenco esistono per quella scelta. Una piattaforma
a inviti può rimandarle; una aperta no, perché il primo giorno in cui chiunque
può iscriversi è anche il primo in cui chiunque può abusarne.

Cinque cose sono già state chiuse in preparazione:

- **Cancellazione ed esportazione dei dati** (artt. 17 e 20 GDPR). L'informativa
  le prometteva da prima che esistessero.
- **Un profilo compare in pubblico solo con l'email confermata.** Prima lo
  richiedeva solo la sitemap: chiunque poteva comparire nella directory con un
  indirizzo mai verificato.
- **Un profilo entra nell'indice solo se ha contenuto reale** (ADR-018).
- **Meccanismo di segnalazione** aperto anche a chi non ha un account, con coda
  di moderazione, motivazione obbligatoria e riscontro automatico a chi segnala
  (ADR-019, 020, 021). Il Digital Services Act lo impone a chiunque ospiti
  contenuti caricati da terzi, indipendentemente dalla dimensione.
- **Termini di servizio** completi, con l'elenco di ciò che non si può
  pubblicare generato dagli stessi motivi usati dalla moderazione: termini e
  moderazione che divergono sono il modo più semplice per rimuovere contenuti
  in base a una regola che da nessuna parte è scritta.

---

## Dove eravamo rimasti — 2 agosto, sera

**Suite verde: 171 test, quattro profili — computer, Android, iPhone,
iPhone SE a 320px.** I 13 saltati sono i test da telefono sul profilo
desktop e viceversa: si escludono da soli, come devono.

```powershell
npm run verify            # tipi, lint, canonical, unit test
npm run test:e2e:setup    # UNA VOLTA SOLA, e dopo ogni aggiornamento di Playwright
npm run test:e2e
git push origin main
```

**Chiudi `npm run dev` prima dei test.** I due processi si contendono la
cartella `.next`. La causa più frequente di rottura — `prisma generate` che
non riesce a sostituire `query_engine-windows.dll.node` e muore con `EPERM` —
è stata rimossa, ma la cartella condivisa resta.

**`test:e2e:setup` non è opzionale.** Playwright tiene i browser in una
cartella di sistema versionata a parte: quando il pacchetto si aggiorna, i
binari scaricati prima non valgono più e *tutti* i test falliscono con
«Executable doesn't exist», compresi quelli che prima passavano.

### Un comando che va lanciato una volta sola

```powershell
npm run reputazione:ricalcola -- --prova   # mostra e non scrive
npm run reputazione:ricalcola              # applica
```

Già eseguito il 2 agosto su nove account. Serve di nuovo **solo** se cambiano
i pesi in `src/lib/reputazione.ts`: è idempotente, calcola dallo stato.

### Cosa provare appena è online

Nessuna di queste cose è stata vista su un browser vero.

**Da telefono** — è lì che stavano i difetti:

1. Da anonimo, **«Accedi» si vede subito**, senza aprire il menu.
2. Tocca un campo del modulo di accesso: su iPhone **la pagina non si
   ingrandisce**.
3. Accedi, poi torna sul sito pubblico: in alto a destra **l'avatar**, non
   «Accedi / Iscriviti». Da lì «Esci».
4. Naviga fra artisti, città e profili per qualche minuto: **non devi essere
   rimandato al login**.
5. Il menu dell'area personale **deve scorrere** fino in fondo, «Esci»
   compreso.
6. La mappa non deve occupare più di due terzi dello schermo.

**Da computer:**

7. Dashboard: livello e reputazione sono due schede distinte, e la reputazione
   dice **cosa la fa salire**.
8. Portfolio: «Elimina» chiede conferma, e i lavori si **vedono**.
9. `/artisti`: l'ordine è cambiato, il punteggio è stato ricalcolato.
10. Un indirizzo inventato tipo `/artisti/non-esisto` deve dare **404**, non
    uno scheletro di caricamento.

---

## 1. I test scrivono nel database di produzione ⚠

`percorso-critico.spec.ts` compila davvero il modulo di registrazione — è
l'unico modo di verificare che chi si iscrive finisca da qualche parte, il
difetto peggiore mai trovato su questo sito. Ogni esecuzione crea quindi
**quattro account veri**, uno per profilo del browser.

Con `DATABASE_URL` che punta a Neon, finiscono in produzione. Il 2 agosto gli
utenti sono passati da 9 a 18 in un pomeriggio: metà sono test.

**Il danno visibile è contenuto** — quegli account non compaiono negli
elenchi, perché `PROFILO_PUBBLICO` richiede l'email confermata e quella non lo
sarà mai. Restano però nei conteggi, nelle statistiche della landing e in
`/api/health`, e crescono di quattro a ogni esecuzione.

**Il danno potenziale no.** Oggi i test solo creano. Il giorno in cui uno
dovesse cancellare o modificare qualcosa per verificare un percorso, lo
farebbe su dati veri.

**Pulizia, adesso:**

```powershell
npm run pulisci:e2e              # mostra e non scrive
npm run pulisci:e2e -- --conferma
```

**La soluzione vera:** un database separato per i test. Su Neon si crea un
*branch* del database in pochi secondi, gratis, con lo stesso schema. Poi:

```powershell
$env:DATABASE_URL="...branch di test..."; npm run test:e2e
```

Finché non è fatto, lo script di pulizia è un cerotto: ripulisce, non
previene.

---

## 2. Upstash Redis ✔ fatto il 2 agosto

`rateLimitBackend: "redis"` in produzione, nessun avviso sull'ambiente. Il
limite di richieste è ora condiviso fra le istanze serverless invece di
valere per ciascuna: con dieci istanze attive, un limite di 5 tentativi era in
pratica 50.

---

## Come era, prima che fosse fatto

La salute in produzione riportava `rateLimitBackend: "memory"`: il limite di
richieste vale per singola istanza serverless, quindi il limite reale è il
numero di istanze moltiplicato per la soglia. Con le registrazioni chiuse era
teoria; aperte, la limitazione è la prima difesa contro la creazione automatica
di account.

**Costo.** Cinque minuti. Piano gratuito, due variabili su Vercel:
`UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

**Verifica.** `/api/health` deve riportare `distributedRateLimit: true`.

---

## 3. I tuoi dati da titolare, e un legale

Sulla pagina privacy i riferimenti mancanti sono evidenziati in giallo: si
vedono apposta. Servono nome o ragione sociale, indirizzo, codice fiscale o
partita IVA, e un indirizzo email per l'esercizio dei diritti.

Poi il testo va letto da un avvocato. È l'unica voce di questo elenco che può
creare un problema legale invece che tecnico.

---

## 4. Riempire Milano

**Perché conta più di tutto il resto, ma viene dopo.** Ogni altra voce migliora
qualcosa che già funziona; questa stabilisce se il progetto ha ragione di
esistere. Una piattaforma a due lati non si valuta dal codice: si valuta dal
fatto che chi cerca un chitarrista a Milano ne trovi venti.

È anche l'unico modo di superare il limite visivo: finché i profili non hanno
fotografie, ogni griglia resta un muro di rettangoli vuoti, e nessun lavoro sul
CSS lo compensa.

**Obiettivo.** Venti-trenta artisti reali, ciascuno con disciplina, biografia
vera e almeno un lavoro nel portfolio — i requisiti della soglia di
indicizzazione. Cinque o sei ingaggi aperti, anche piccoli.

**Come.** Non inventarli. Contatta artisti veri e offri di costruire il
profilo: per loro è una pagina indicizzata gratis, per te contenuto autentico.
Chiedi consenso scritto per testo e immagini.

---

## 5. Cancellare gli account di prova

`kkkk` e `il-tuo-nome` esistono in produzione. La soglia di qualità li tiene
fuori dall'indice, ma restano negli elenchi pubblici e chi li incontra capisce
di essere su un sito vuoto.

```powershell
npm run user:elimina -- kkkk il-tuo-nome
npm run user:elimina -- kkkk il-tuo-nome --conferma
```

Senza `--conferma` mostra solo cosa sparirebbe. Guarda i conteggi: un account
di prova ha quasi sempre zero di tutto, e un numero alto è il segnale che stai
cancellando la persona sbagliata.

---

## 6. Search Console

Solo ora, e non prima. Un dominio nuovo viene valutato su ciò che la prima
scansione trova: presentarsi con pagine vuote significa farsi misurare nel
momento peggiore.

Registra `https://vybeshub.art` — il dominio nudo, che dal 1° agosto è quello
primario — invia `sitemap.xml`, e dopo qualche giorno guarda le pagine escluse.
Profili marcati «Esclusa per tag noindex» sono la difesa che funziona.

---

## 7. Google OAuth

`googleOAuth: false` in produzione. Riduce l'attrito alla registrazione, che su
una piattaforma a due lati conta. Il codice c'è: mancano le credenziali.

---

## Voci senza fretta

- **`MIN_ITEMS_FOR_INDEX` è a 1.** Una pagina città×disciplina entra
  nell'indice con un solo artista. Da alzare a 3 quando i contenuti crescono.
- **Il client Sentry è disattivato** (ADR-016): gli errori solo-browser non si
  vedono. Da riconsiderare se l'area privata diventa la parte principale.
- **`next-auth` è in beta** (ADR-005), versione fissata esatta.
- **Lo schema non usa enum né array nativi** — eredità della portabilità da
  SQLite, oggi solo un compromesso.
- **Moderazione delle immagini.** Con le registrazioni aperte, prima o poi
  qualcuno caricherà qualcosa che non deve stare su un sito indicizzato. Il
  meccanismo di segnalazione copre il caso reattivo; un filtro automatico
  sarebbe la difesa preventiva, e costa un servizio esterno.

---

## Come si verifica che tutto regga

```powershell
npm run verify        # tipi, lint, coerenza dei canonical, test
npm run build
curl.exe -s https://vybeshub.art/api/health
```

L'ultimo è quello che conta: esercita lo stesso percorso del traffico reale —
connessione al database attraverso il pooler, non una scorciatoia.
