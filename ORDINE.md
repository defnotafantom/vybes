# Ordine di lavoro

Cosa resta da fare, in ordine di urgenza. Ogni voce dice **perché** viene prima
delle altre, e cosa succede se la si salta.

Aggiornato al 1° agosto 2026. Produzione in linea su `vybeshub.art`, salute
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

## 1. Applicare la migrazione delle segnalazioni ⚠️

**Il codice c'è, il database no.** Il modello `Report` è nello schema e la
migrazione è scritta, ma non è stata applicata: l'ambiente in cui è nata non ha
accesso al database, e Prisma non può girarci.

Finché non la applichi, **il progetto non compila**: ventidue errori di tipo,
tutti perché `prisma.report` non esiste ancora nel client generato. Non sono
difetti del codice, spariscono tutti insieme.

Due comandi, nel tuo terminale:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Poi verifica che sia tornato tutto a posto:

```powershell
npm run verify
```

Se `migrate deploy` si lamenta di una deriva, fermati e chiedimi: la migrazione
è scritta a mano seguendo le convenzioni di nome di Prisma proprio per evitarlo,
ma è l'unico punto in cui non ho potuto verificare da solo.

---

## 2. Upstash Redis

La salute in produzione riporta `rateLimitBackend: "memory"`: il limite di
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

## 7. Rifinire l'esplosione del marchio

Non è una priorità: l'effetto funziona, va reso quello che era stato pensato.

Oggi a caricarsi è il logo intero. Dovrebbe essere il **logotipo «Vybes»** — lo
stesso della barra, con una resa più materica — che nasce dal centro del
marchio e cresce finché scoppia, con un tetto di espansione che lo tenga dentro
la spirale rotante. I colori delle macchie vanno presi dalle lettere.

Le forme delle macchie restano come sono.

---

## 8. Google OAuth

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
