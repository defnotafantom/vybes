# Vybes

Piattaforma che collega artisti e chi li ingaggia. Next.js 15 (App Router),
TypeScript, Prisma su PostgreSQL, Tailwind. Costruita SEO-first: tutto ciò che
ha valore per la ricerca organica è renderizzato lato server e statico dove
possibile.

![CI](https://github.com/USERNAME/vybes/actions/workflows/ci.yml/badge.svg)

## Documentazione

| Documento | A cosa serve |
|---|---|
| [PANORAMICA.md](./PANORAMICA.md) | **Parti da qui.** Cos'è, cosa è risolto, cosa resta |
| [DECISIONI.md](./DECISIONI.md) | Ogni scelta architetturale, con le alternative scartate e il prezzo pagato |
| [MANUALE.md](./MANUALE.md) | I passi per arrivare online, con i comandi esatti |
| [COLLOQUIO.md](./COLLOQUIO.md) | Come spiegare il progetto e le domande che arrivano |
| [PORT.md](./PORT.md) | Cosa è stato preso dalla versione precedente e perché |

---

## Avvio in locale

```bash
npm install
cp .env.local.example .env.local     # compila DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed                      # 20 città, 8 quest, 6 artisti e 6 ingaggi demo
npm run dev
```

Serve un PostgreSQL: un branch di sviluppo su Neon (consigliato: stesso motore
della produzione) oppure un container locale — il comando è in
`.env.local.example`.

Account demo, password `Password123`:

| Email | Ruolo |
|---|---|
| `recruiter@vybes.test` | organizzatore, ha pubblicato gli ingaggi demo |
| `chiara-bellandi@vybes.test` | artista |

Diagnostica rapida: `http://localhost:3000/api/health`.

---

## Struttura delle rotte

### Pubbliche e indicizzabili

| Rotta | Rendering | Note SEO |
|---|---|---|
| `/` | ISR 10 min | FAQPage + Organization + WebSite (SearchAction) |
| `/artisti` · `?disciplina=…` | ISR 10 min | ItemList, canonical alla pagina 1 |
| `/artisti/[slug]` | SSG + ISR 1 h | `Person` o `MusicGroup`, OG image dinamica |
| `/eventi` · `?categoria=…` | ISR 5 min | ItemList |
| `/eventi/[slug]` | SSG + ISR 15 min | `Event` con `Offer` e `Place` → rich result |
| `/portfolio/[slug]` | ISR 1 h | `ImageObject` / `VideoObject` / `AudioObject` |
| `/citta` | ISR 24 h | hub regionale |
| `/citta/[citta]` | SSG | FAQPage localizzata, intro univoca per città |
| `/citta/[citta]/artisti` | SSG | ItemList |
| `/citta/[citta]/artisti/[disciplina]` | SSG selettivo | long tail: "DJ a Milano" |
| `/citta/[citta]/eventi` | SSG | ItemList + archivio |
| `/mappa` | ISR 10 min | mappa client + elenco testuale per i crawler |
| `/come-funziona` · `/chi-siamo` · `/privacy` · `/termini` | statiche | |

### Fuori indice (`noindex`)

`/cerca`, `/accedi`, `/registrati`, `/password-dimenticata`, `/reimposta-password`,
`/verifica-email`, tutta `/dashboard/*`, la paginazione oltre la prima pagina,
gli eventi annullati o in bozza, le pagine di elenco senza contenuto.

---

## Come è fatto il layer SEO

**Un solo costruttore di metadata.** `src/lib/seo.ts` espone `buildMetadata()`:
ogni pagina lo chiama e ottiene canonical assoluto, hreflang, Open Graph e
Twitter card coerenti. Non esistono pagine con metadata scritti a mano che
possono divergere.

**Dati strutturati centralizzati.** `src/lib/jsonld.ts` costruisce gli oggetti
Schema.org, `<JsonLd>` li stampa lato server. Tipi coperti: Organization,
WebSite, Person, MusicGroup, Event, Offer, Place, CreativeWork, ItemList,
BreadcrumbList, FAQPage.

**Sitemap partizionata.** `/sitemap.xml` è un indice verso cinque file
(`statiche`, `citta`, `artisti`, `eventi`, `portfolio`), ognuno con la propria
cadenza di `revalidate`. Ogni file resta sotto i 50.000 URL. Gli eventi passati
scendono a `priority 0.3` e `changefreq monthly` per non sprecare crawl budget.

**Difesa dal thin content.** 20 città × 10 discipline fanno 200 combinazioni,
quasi tutte vuote all'inizio. Le pagine sotto la soglia `MIN_ITEMS_FOR_INDEX`
(`src/lib/constants.ts`) restano raggiungibili e linkate, ma fuori da sitemap e
indice. Segnalare a Google duecento pagine che dicono "nessun profilo" non porta
traffico: abbassa la valutazione del dominio e la frequenza di scansione anche
delle pagine buone.

**Rigenerazione mirata.** Le API chiamano `revalidatePath()` sulle pagine
realmente interessate: pubblicare un ingaggio rigenera `/eventi`,
`/citta/<città>/eventi` e `/mappa`, non l'intero sito.

**Design e movimento.** Token in `globals.css` (colori come terne RGB, così
Tailwind può applicarci l'opacità), scala brand completa fino a 950, ombre a due
strati, sette animazioni riusabili. Le transizioni tra pagine stanno in
`template.tsx` e **non animano il primo caricamento**: un fade-in da opacity 0
ritarderebbe il momento in cui il browser dipinge l'elemento più grande, che è
esattamente ciò che misura l'LCP. Gli skeleton replicano il rapporto d'aspetto
dei componenti che sostituiscono, per non generare layout shift all'arrivo dei
dati. Tutto si azzera sotto `prefers-reduced-motion`.

**Performance.** Font con `display: swap`, `next/image` con AVIF/WebP,
compressione delle immagini nel browser prima dell'upload, `priority` solo sulle
prime tre card above the fold, Leaflet caricato dinamicamente e solo su `/mappa`
(altrove c'è `StaticMap`, un iframe lazy che non costa JavaScript).

### `NEXT_PUBLIC_SITE_URL` non è opzionale

Tutto il layer passa da `siteUrl()`. Se manca, il codice ricade su `VERCEL_URL`,
che è l'URL del singolo deployment: canonical, sitemap e OG punterebbero a
`vybes-a1b2c3.vercel.app`. `src/lib/env.ts` blocca l'avvio in produzione proprio
per questo.

---

## Test

```bash
npm test              # 81 test unitari (Vitest), ~2 secondi
npm run test:e2e      # 20 test end-to-end (Playwright)
npm run test:coverage
```

Gli unitari coprono il layer SEO (canonical, hreflang, troncamento descrizioni,
JSON-LD), la validazione, il rate limit, la curva dei livelli, gli slug e i
permessi. Gli e2e verificano che robots, sitemap, canonical e dati strutturati
non regrediscano in silenzio: sono errori che non rompono la build e che ci si
accorge di avere settimane dopo, guardando Search Console.

---

## Scelte tecniche da conoscere

**Chat: SSE, non Socket.io.** L'App Router non espone un server HTTP a cui
agganciare Socket.io senza un custom server, e su Vercel non regge proprio.
`/api/messages/[id]/stream` è uno stream Server-Sent Events con **due sorgenti**:
il bus in-process (`src/lib/realtime.ts`), istantaneo ma limitato all'istanza
corrente, e il tailing del database ogni 2 secondi, che copre i messaggi scritti
da altre istanze. Su Vercel chi scrive e chi ascolta finiscono quasi sempre su
funzioni diverse, quindi il secondo è quello che garantisce la consegna. Il
dedup è per id, così un messaggio che arriva da entrambe le sorgenti viene
mostrato una volta sola.

Redis pub/sub qui non aiuterebbe: servirebbe comunque una connessione
persistente per istanza, e il database — che è già la fonte di verità — risolve
lo stesso problema senza aggiungere un servizio.

**Upload: Vercel Blob.** `src/lib/upload.ts` valida estensione, dimensione
(15 MB) e **magic bytes** — il MIME dichiarato dal client non è affidabile. Il
driver si sceglie da solo: `vercel-blob` su Vercel, `local` in sviluppo. Il ramo
locale **non** funziona in produzione: il filesystem delle funzioni è effimero.
`src/lib/image-client.ts` ridimensiona e converte in WebP prima di inviare.

**Database: Neon.** Due URL, servono entrambe. `DATABASE_URL` è il pooler, per
le query a runtime. `DIRECT_URL` è l'endpoint diretto, richiesto da
`prisma migrate` che ha bisogno di lock sullo schema. Migrazioni versionate,
applicate automaticamente dallo script `build`. Indici composti sulle query
calde (`citySlug + status + isPublic + startsAt` per la directory locale).

Lo schema non usa enum né array nativi: le discipline sono una stringa CSV e i
tag una tabella ponte. Era una scelta per la portabilità da SQLite; ora che il
target è Postgres si potrebbe passare a `String[]` ed enum nativi, ma tocca
diversi file e il guadagno è modesto.

**Due assi di ruoli.** `role` distingue artista da organizzatore ed è il ruolo di
prodotto. `adminRole` (`src/lib/permissions.ts`) è la moderazione: un artista può
moderare senza smettere di essere un artista.

**Sicurezza.** Rate limit per IP e per rotta (`src/lib/rate-limit.ts`). Con
`UPSTASH_REDIS_REST_*` configurate il contatore è condiviso da tutte le istanze
e il limite è quello vero; senza, vale per singola istanza. Se Redis è
configurato ma non risponde si ricade sulla memoria invece di bloccare: un
guasto del rate limiter non deve diventare un guasto del sito. Password bcrypt
cost 12 con policy applicata sia client sia server,
token di verifica salvati come hash SHA-256, validazione Zod su ogni endpoint,
header di sicurezza in `next.config.ts`, sessione JWT httpOnly gestita da
Auth.js.

**hreflang IT/EN.** L'infrastruttura c'è (`LOCALES` in `src/lib/seo.ts`) ma è
attiva solo su `it`: le rotte `/en/*` non esistono e dichiarare hreflang verso
URL inesistenti è un errore che Search Console segnala. Quando le pagine
inglesi ci saranno, aggiungi `"en"` a `LOCALES` e metadata e sitemap si
aggiornano da soli.

---

## Cosa manca ancora

- **Blog.** Il canale più efficace per la long tail informazionale ("quanto
  costa ingaggiare una band"). Non c'è.
- **Rotte `/en`.** L'infrastruttura hreflang è pronta, mancano le pagine.
- **Feature di prodotto dal vecchio progetto** — livello social, gamification
  avanzata, pannello admin. Analisi e raccomandazione in [PORT.md](./PORT.md).
