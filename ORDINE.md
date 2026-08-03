# Ordine di lavoro

Cosa resta da fare, in ordine di urgenza. Ogni voce dice **perché** viene prima
delle altre, e cosa succede se la si salta.

Aggiornato al 3 agosto 2026. Produzione in linea su `vybeshub.art`, salute
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

## Dove eravamo rimasti — 3 agosto

**Due giri col browser, non uno.** Il primo, sulle pagine pubbliche, ha
trovato dieci difetti; sette avevano la stessa causa — spazi riservati a
immagini che non ci sono — e la regola che ne è uscita vale per ogni
componente nuovo: **un componente va disegnato per il caso vuoto quanto per
quello pieno.**

Il secondo, sull'**area personale**, che il primo non aveva toccato: è dove un
artista appena reclutato passa tutto il tempo, ed era l'unica parte del sito
mai guardata da dentro con una sessione aperta. Cinque difetti, tutti corretti
(ADR-032, 033, 034):

- Il menu laterale si stampava **sopra** «Esplora il sito» e «Esci»: `sticky`
  era su un pezzo della colonna invece che sulla colonna.
- Un ingaggio del **3 marzo 2024** compariva identico a uno aperto — stesso
  «Gestisci», stesso «0 candidature» — mentre `now` era già calcolato due
  righe sopra e usato in ogni altro elenco della stessa pagina.
- Il modulo del profilo raccoglieva undici errori e ne mostrava quattro: gli
  altri sette erano un rifiuto silenzioso in attesa di succedere.
- La biografia, che il sito chiede lunga quattrocento caratteri, non ne
  mostrava il conto. L'headline sì.
- Undici pagine dell'area personale avevano tutte lo stesso titolo nella
  scheda del browser.

**Sightengine è configurato**: `/api/health` riporta `moderazioneImmagini:
true`. La voce 3-bis è chiusa.

**Terzo giro, sulle pagine dell'area personale rimaste** — portfolio,
pubblicazione di un ingaggio, conversazione, coda di moderazione (ADR-035,
036, 037):

- **Si poteva pubblicare un ingaggio con data già passata.** Il modulo
  accettava, l'API rispondeva 201, la pagina si apriva — e l'annuncio non
  compariva in nessun elenco, perché tutte le directory filtrano per
  `startsAt >= adesso`. È il difetto peggiore trovato finora: non un errore
  che si vede, un successo che non è successo. È così che è nato l'ingaggio
  del 3 marzo 2024.
- «1 messaggi» in cima a una conversazione: lo stesso «1 ARTISTI» corretto
  due giorni prima. Ora `conta()` e `concorda()`, e i sei punti già giusti
  convertiti insieme.
- Le caselle di spunta erano quelle native, tredici pixel, col grigio di
  sistema — e governano lo sparire dalla directory e il dichiarare un
  compenso.
- Da telefono i contatori delle cose in attesa stavano dentro un pannello
  chiuso: si vedevano solo dopo essere andati a cercarli.
- `EventForm` mostrava sette errori su sedici, stesso difetto di
  `ProfileForm`. Ora entrambi usano `Errore` e `ErroriOrfani`.

Coperti da prove nuove: `tests/unit/validations.test.ts` (data passata),
`tests/unit/testo.test.ts`, e un blocco «dentro l'area personale» in
`tests/e2e/mobile.spec.ts` — che è anche la prima volta che l'area privata
viene percorsa da uno schermo stretto.

### Cosa manca per aprire davvero al pubblico

**1. L'indirizzo email del titolare** — `src/lib/titolare.ts`, l'unico campo
rimasto vuoto. Meglio `privacy@vybeshub.art` che una casella personale: finisce
su una pagina indicizzata, e se cambi provider un alias resta lo stesso mentre
un indirizzo personale no — e un contatto pubblicato che smette di funzionare
significa richieste di cancellazione che rimbalzano. Cloudflare Email Routing
se il DNS è lì, altrimenti ImprovMX; entrambi gratis.

Da controllare anche il campo `indirizzo`: è di tredici caratteri, e non ci
stanno via, numero, CAP, città e provincia.

Poi il testo va letto da un avvocato.

**2. I venti artisti** — `RECLUTAMENTO.md` ha il messaggio, le quattro cose
da chiedere, la formula di consenso e il formato del file. Poi
`npm run artisti:importa`.

### Prima di ogni push

```powershell
npm run verify
npm run test:e2e:setup    # una volta sola, e dopo ogni aggiornamento di Playwright
npm run test:e2e          # chiudi `npm run dev` prima
```

Serve `E2E_DATABASE_URL` in `.env.local` — c'è già, punta al branch Neon di
test. Senza, i test si rifiutano di partire: creano account veri e non devono
farlo in produzione.

---

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

**Da adesso i test si rifiutano di partire** se non è stato dichiarato un
database su cui possono scrivere. Non lo indovinano dall'indirizzo — con Neon
non si può, perché gli endpoint hanno nomi autogenerati e **il nome del branch
non compare nell'host** — quindi lo si dichiara.

**Configurazione, una volta sola:**

1. Console Neon → **Branches** → *Create branch*
2. Parent **`production`** (è il branch principale, rinominato da Neon: ha lo
   schema con tutte le migrazioni e i dati veri, che ai test servono — diverse
   prove cercano un artista o un ingaggio esistente e altrimenti si saltano).
   `development` può essere indietro o vuoto.
3. **Auto-delete disattivato.** Un branch che si autocancella farebbe fallire
   i test un mattino senza spiegazione.
4. Copia la connection string **pooled** del branch e mettila in `.env.local`
   — non è versionato e ha la precedenza su `.env`:

```
E2E_DATABASE_URL="postgresql://...branch di test..."
```

Da quel momento `npm run test:e2e` funziona senza altri passaggi: il controllo
la riconosce e il server dei test la riceve al posto di `DATABASE_URL`.

La copia è copy-on-write, quindi non consuma spazio e ci mette pochi secondi.

**Ripulire i residui già in produzione** — da un terminale normale, non da uno
in cui hai cambiato la variabile:

```powershell
npm run pulisci:e2e              # mostra e non scrive
npm run pulisci:e2e -- --conferma
```

Se hai davvero bisogno di girare sul database vero, la via d'uscita c'è ed è
volutamente scomoda: `$env:E2E_CONSENTI_DB_PRODUZIONE="1"`. Deve costare più
che creare il branch.

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

## 3. I tuoi dati da titolare, e un legale ⚠

**È il vero blocco all'apertura.** La pagina `/privacy` è online e
indicizzata, e dichiara di sé: «Da completare prima dell'apertura al
pubblico». Un'informativa senza titolare non identifica chi risponde del
trattamento, quindi non è opponibile a nessuno — e intanto stai raccogliendo
email e password di persone reali.

**Ora si compila in un posto solo:** `src/lib/titolare.ts`. Cinque campi.
L'avviso giallo su privacy e termini sparisce da solo quando sono tutti
pieni, e ricompare se qualcuno ne svuota uno.

```ts
export const TITOLARE = {
  nome: "",        // nome e cognome, o ragione sociale
  indirizzo: "",   // via, numero, CAP, città, provincia
  fiscale: "",     // partita IVA, oppure codice fiscale
  email: "",       // meglio dedicato: finisce su una pagina indicizzata
  foro: "",        // città del foro competente nei termini
} as const;
```

Poi il testo va letto da un avvocato. È l'unica voce di questo elenco che può
creare un problema legale invece che tecnico.

---

## 3-bis. Moderazione delle immagini ✔ fatto il 3 agosto

`moderazioneImmagini: true` in produzione. I caricamenti vengono classificati
prima di essere salvati: un contenuto respinto non esiste mai a un indirizzo
pubblico, nemmeno per i secondi che servirebbero a controllarlo dopo.

Se il servizio non risponde o va in timeout, i caricamenti passano lo stesso —
è deliberato (ADR-030): un guasto di terzi non deve diventare un guasto
nostro, e il contenuto resta comunque segnalabile.

---

## 4. Riempire Milano — vedi RECLUTAMENTO.md

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

`RECLUTAMENTO.md` ha il messaggio da mandare, le quattro cose da chiedere, la
formula di consenso da farsi rimandare per iscritto e il formato del file.
Poi `npm run artisti:importa` crea i profili completi — con biografia,
discipline, portfolio e reputazione già calcolata — e segnala quali non
supereranno la soglia di indicizzazione, dicendo cosa manca.

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
