# Ordine di lavoro

Cosa resta da fare, in ordine di urgenza. Non è un elenco di desideri: ogni voce
dice **perché** viene prima delle altre, e cosa succede se la si salta.

Aggiornato al 1° agosto 2026. Stato della produzione: `vybeshub.art` in linea,
salute verde, sei commit del giorno rilasciati.

---

## Prima di tutto: non registrare il sito su Google adesso

Sembra il passo naturale ed è invece quello che va rimandato. Un dominio nuovo
viene valutato su ciò che la prima scansione trova. Finché i profili veri sono
una manciata e il contenuto è quasi tutto di prova, presentarsi a Google
significa farsi misurare nel momento peggiore.

L'ordine giusto è: contenuto vero → verifica → registrazione. Non il contrario.

---

## 1. Riempire Milano — il passo che decide tutto

**Perché è il primo.** Ogni altra voce di questo elenco migliora qualcosa che
già funziona. Questa è l'unica che stabilisce se il progetto ha ragione di
esistere. Una piattaforma a due lati non si valuta dal codice: si valuta dal
fatto che qualcuno che cerca un chitarrista a Milano ne trovi venti.

È anche l'unico modo di superare il limite visivo di cui abbiamo parlato più
volte: finché i profili non hanno fotografie, ogni griglia resta un muro di
rettangoli vuoti, e nessun lavoro sul CSS lo può compensare.

**Obiettivo.** Venti-trenta artisti reali su Milano, ciascuno con disciplina,
biografia vera e almeno un lavoro nel portfolio — i requisiti della soglia di
indicizzazione (ADR-018). Cinque o sei ingaggi aperti, anche piccoli.

**Come.** Non inventarli. Contatta artisti veri e offri di costruirgli il
profilo: per loro è una pagina indicizzata gratis, per te è contenuto autentico.
Chiedi il consenso scritto per testo e immagini.

**Verifica.** `/citta/milano` deve reggere lo sguardo di un organizzatore che
non ti conosce.

---

## 2. Cancellare gli account di prova

`kkkk` e `il-tuo-nome` esistono in produzione. La soglia di qualità li tiene
ormai fuori dall'indice da sola, quindi non è più un'urgenza SEO — ma restano
visibili negli elenchi pubblici, e un visitatore che li incontra capisce di
essere su un sito vuoto.

**Come.** Da Neon, o con uno script che chieda conferma. Attenzione alle
cancellazioni a cascata: un utente ha post, partecipazioni, messaggi.

---

## 3. Upstash Redis per il rate limiting

La salute in produzione riporta `rateLimitBackend: "memory"`. Significa che il
limite di richieste vale per singola istanza serverless: con più istanze attive,
il limite reale è il numero di istanze moltiplicato per la soglia. Contro un
attacco distribuito non tiene.

**Costo.** Circa cinque minuti. Piano gratuito Upstash, due variabili
d'ambiente su Vercel: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

**Verifica.** `/api/health` deve riportare `distributedRateLimit: true`.

**Perché non è al primo posto.** Il traffico attuale è vicino a zero. È un
rischio reale ma non ancora esposto — e il codice degrada da solo invece di
bloccare, che è il motivo per cui si può aspettare senza ansia.

---

## 4. Privacy e termini: farli leggere a qualcuno

Le due pagine esistono ma sono state scritte da un modello linguistico, non da
un avvocato. Il progetto tratta dati personali di artisti (nome, città,
immagini, contatti) e mette in relazione persone che si scambiano denaro.

**Cosa serve almeno.** Titolare del trattamento con dati veri, base giuridica,
tempi di conservazione, diritti dell'interessato e come esercitarli, eventuali
responsabili esterni — Vercel, Neon, Resend, Sentry — e dove risiedono i dati.

**Onesto.** Non è codice e non è divertente, ma è l'unica voce di questo elenco
che può creare un problema legale invece che tecnico.

---

## 5. Search Console

Solo ora. Registra la proprietà su `https://vybeshub.art` — il dominio nudo, che
dal 1° agosto è quello primario — invia `sitemap.xml` e controlla il rapporto di
copertura dopo qualche giorno.

**Cosa guardare.** Le pagine escluse. Se compaiono profili sotto la soglia
marcati "Esclusa per tag noindex", la difesa sta funzionando come previsto.

---

## 6. Le onde del marchio, versione fisica

Rimandato per scelta. L'implementazione attuale fa traslare un pacchetto
sinusoidale rigido: la sinusoide però rappresenta l'ampiezza **nel tempo**, non
la forma nello spazio. Un'onda sonora reale è un fronte di compressione che si
espande, con ampiezza che decade come 1/√r.

Una resa più onesta: fronti circolari che si espandono a velocità costante,
modulati in opacità da una sinusoide lungo il raggio — l'oscillazione la si vede
nell'alternanza chiaro/scuro dei fronti, non in una linea ondulata.

---

## 7. Google OAuth

`googleOAuth: false` in produzione. Riduce l'attrito alla registrazione, che su
una piattaforma a due lati conta. Il codice c'è già: mancano le credenziali.

---

## Voci senza fretta

- **`MIN_ITEMS_FOR_INDEX` è a 1.** Una pagina città×disciplina entra nell'indice
  con un solo artista. Da alzare a 3 quando i contenuti crescono.
- **Il client Sentry è disattivato** (ADR-016): gli errori solo-browser non si
  vedono. Da riconsiderare se l'area privata diventa la parte principale.
- **`next-auth` è in beta** (ADR-005), versione fissata esatta. Da rivalutare
  all'uscita della stabile.
- **Lo schema non usa enum né array nativi** — eredità della portabilità da
  SQLite, oggi solo un compromesso.

---

## Come si verifica che tutto regga

```powershell
npm run typecheck
npm run lint
npm test
npm run build
curl.exe -s https://vybeshub.art/api/health
```

L'ultimo è quello che conta davvero: esercita lo stesso percorso del traffico
reale — connessione al database attraverso il pooler, non una scorciatoia.
