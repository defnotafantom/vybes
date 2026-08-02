# Vybes sul curriculum

Testi pronti da copiare, in ordine di lunghezza. Sotto ciascuno, perché è
scritto così.

Una premessa che vale per tutti: **niente qui millanta trazione.** Il sito è
online e funziona, ma gli utenti reali sono pochi e i profili in gran parte di
esempio. Un recruiter tecnico se ne accorge in trenta secondi aprendo il
dominio, e a quel punto tutto il resto perde credibilità. Il valore da vendere
è l'ingegneria e il metodo, che sono veri e verificabili.

---

## 1. La riga nel curriculum

Se hai una sezione «Progetti» con due o tre righe per voce:

> **Vybes** — vybeshub.art · github.com/defnotafantom/vybes
> Marketplace a due lati per artisti e organizzatori di eventi. Next.js 15,
> TypeScript, PostgreSQL/Prisma, deploy su Vercel. Architettura orientata alla
> ricerca organica: rendering statico con rigenerazione incrementale, dati
> strutturati Schema.org, sitemap partizionata e soglia anti contenuto povero.
> Ventinove decisioni architetturali documentate con alternative e costi.
> Conformità GDPR (artt. 17 e 20) e Digital Services Act. In produzione.

**Perché così.** La prima riga dice *cos'è* in cinque parole: chi legge
curriculum tutto il giorno decide lì se continuare. Le tecnologie stanno in
mezzo perché servono ai filtri automatici, non a convincere. L'ultima parte è
quella che ti distingue: quasi nessun progetto da portfolio ha decisioni
documentate e adempimenti normativi, e sono entrambi verificabili in un clic.

---

## 2. La descrizione del repository su GitHub

Il campo *About*, quello sotto il titolo. Massimo 350 caratteri, e viene letto
per primo:

> Piattaforma italiana che collega artisti e chi li ingaggia. Next.js 15,
> TypeScript, Prisma/PostgreSQL. Costruita attorno alla ricerca organica: ISR,
> Schema.org, directory locale. Ogni scelta architetturale è motivata in
> DECISIONI.md.

Metti come sito `https://vybeshub.art` e come argomenti: `nextjs`,
`typescript`, `prisma`, `postgresql`, `seo`, `marketplace`, `tailwindcss`.

**L'ultima frase è la più importante di tutto il documento.** Manda chi guarda
verso `DECISIONI.md`, che è la cosa migliore che hai — e ci arriva pensando di
avere fatto lui una scoperta.

---

## 3. LinkedIn, sezione Progetti

Circa mille caratteri, il limite oltre il quale compare «vedi altro» e nessuno
clicca:

> **Vybes** — piattaforma che collega artisti e chi li ingaggia
>
> Un marketplace a due lati ha il problema dell'uovo e della gallina: gli
> artisti servono ad attrarre gli organizzatori e viceversa, e comprare
> traffico su entrambi i lati costa più di quanto un progetto agli inizi possa
> permettersi. La scommessa è che il canale di acquisizione sia la ricerca
> organica — e quella scelta ha condizionato quasi ogni decisione tecnica.
>
> Ogni profilo e ogni ingaggio è una pagina statica servita dalla CDN con dati
> strutturati Schema.org. Una directory locale genera circa duecento pagine per
> intercettare ricerche come «DJ a Milano», con una soglia che tiene fuori
> dall'indice quelle ancora vuote: Google penalizza i domini che gli segnalano
> centinaia di pagine povere, e la penalità ricade anche sulle pagine buone.
>
> Stack: Next.js 15 (App Router), TypeScript, Prisma su PostgreSQL, Auth.js,
> Tailwind, Vercel. Test end-to-end su quattro profili di browser, computer e
> telefono, motori Blink e WebKit.
>
> Ventinove decisioni architetturali sono documentate con le alternative
> scartate e il prezzo pagato per ognuna.

**Perché apre col problema di business.** Su LinkedIn ti leggono anche
recruiter non tecnici: la prima frase deve significare qualcosa per loro.
Chi è tecnico arriva comunque al secondo paragrafo, e lì trova la sostanza.

---

## 4. Se ti chiedono «parlamene» a voce

Sta in `COLLOQUIO.md`, sezione *Come presentarlo in trenta secondi*, insieme
alle undici domande che arrivano più spesso e alle risposte.

Ripassa in particolare le cinque cose da sapere a memoria in fondo a quel
documento — e il capitolo sui difetti trovati, che è il pezzo più forte che
hai e l'unico che non si può imparare a tavolino.

---

## 5. I numeri, se ti servono

Aggiornati al 2 agosto 2026. Verificabili nel repository, quindi non
gonfiarli: 183 file sorgente sono un progetto serio, dire «cinquecento»
significa perdere tutto al primo controllo.

| | |
|---|---|
| File sorgente TypeScript/TSX | 183 |
| Righe in `src/` | circa 17.000 |
| Modelli nel database | 20 |
| Decisioni architetturali documentate | 29 |
| File di test unitari | 13 |
| Test end-to-end | 171, su 4 profili di browser |
| Migrazioni versionate | 3 |

---

## 6. Le tre cose da dire, se puoi dirne solo tre

Quando lo spazio è poco — un colloquio breve, una call di screening, un
messaggio a un recruiter — queste sono quelle che pagano. In quest'ordine.

**Uno: la SEO è architettura, non un plugin.** Un costruttore unico di
metadati che ogni pagina è obbligata a usare, quindi non esiste una pagina che
possa divergere dalle altre col tempo. Sitemap partizionata in cinque file con
frequenze diverse. Una soglia che tiene fuori dall'indice le pagine ancora
vuote. Chiunque sa mettere un `<title>`; questo è un altro mestiere.

**Due: diciannove difetti trovati usando il sito, non leggendo il codice.**
Tipi, lint, revisione e la suite di test non ne avevano visto nessuno — perché
guardavano *dentro* le pagine, mentre i difetti stavano nei passaggi *fra* le
pagine, negli stati vuoti, e in ciò che può fare chi arriva da fuori. Da lì la
regola che governa i test oggi: si verifica **dove si finisce**, non che
qualcosa esista.

**Tre: gli adempimenti li ho affrontati, non rimandati.** Cancellazione ed
esportazione dei dati (GDPR artt. 17 e 20), meccanismo di segnalazione aperto
anche a chi non ha un account con coda di moderazione e motivazione obbligatoria
(Digital Services Act, art. 17). Il DSA vale per chiunque ospiti contenuti di
terzi, indipendentemente dalla dimensione — e quasi nessun progetto da
portfolio ci ha pensato.

---

## 7. Cosa non dire

**Non dire che ha utenti.** Non ne ha ancora, e si verifica in un clic. Di' che
è in produzione e che il prossimo passo è portarci i primi venti artisti reali
di una città: è vero, ed è una risposta da chi ha capito qual è il problema
adesso.

**Non elencare tecnologie come se fossero risultati.** «Ho usato Next.js,
Prisma, Tailwind» descrive scelte che oggi fanno tutti. «Ho scelto il rendering
statico perché il crawler deve leggere senza eseguire JavaScript, e su un
progetto che vive di ricerca organica una SPA sarebbe stata la scelta che lo
condanna» descrive un ragionamento.

**Non nascondere i limiti.** Sono già scritti in `DECISIONI.md` — lo schema
senza enum nativi, `next-auth` in beta, il client Sentry disattivato — e
citarne uno spontaneamente vale più di dieci pregi elencati. Chi intervista
distingue subito chi conosce i propri compromessi da chi non sa di averli.
