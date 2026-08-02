# Registro delle decisioni architetturali

Ogni scelta importante del progetto, con il problema che risolveva, le
alternative scartate e il prezzo che si paga per averla presa.

Il formato è quello degli **ADR** (Architecture Decision Record), una pratica
diffusa nei team che devono ricordarsi *perché* hanno fatto una cosa sei mesi
dopo averla fatta. Una decisione senza il suo contesto, a distanza di tempo,
sembra sempre arbitraria — anche quando era giusta.

**Una premessa che spiega tutto il resto.** Vybes è un marketplace a due lati:
gli artisti servono per attrarre gli organizzatori, e gli organizzatori per
attrarre gli artisti. Chi parte da zero ha il classico problema dell'uovo e
della gallina, e comprare traffico a pagamento su entrambi i lati costa più di
quanto un progetto agli inizi possa permettersi. La scommessa è quindi che il
canale di acquisizione sia la **ricerca organica**: ogni profilo e ogni ingaggio
è una pagina pubblica che intercetta ricerche come "DJ a Milano". Da qui in poi,
quando una decisione sembra strana, quasi sempre la ragione è questa.

---

## ADR-001 · Next.js App Router, non una SPA

**Problema.** Le pagine che portano traffico — profili, ingaggi, directory
locale — devono essere leggibili da un crawler. Devono anche mostrare dati
freschi: un ingaggio pubblicato stamattina non può comparire fra un giorno.

**Alternative valutate.**

*React + Vite (SPA).* La più veloce da scrivere. Ma il contenuto arriva dopo
l'esecuzione del JavaScript: Google lo renderizza in una seconda passata, con
ritardi che vanno da giorni a settimane, e gli altri crawler spesso non lo fanno
affatto. Su un progetto la cui unica leva è la ricerca organica, è la scelta che
lo condanna.

*Next.js Pages Router.* Funzionerebbe, ma è l'API in manutenzione. Su un
progetto nuovo significa partire già indietro.

*Astro.* Ottimo per siti prevalentemente statici. Qui però c'è un'area privata
consistente — feed, chat, dashboard — e Astro diventa scomodo quando
l'interattività non è più un'isola ma metà dell'applicazione.

**Decisione.** Next.js 15 con App Router, e — questo è il punto vero — **una
strategia di rendering diversa per ogni tipo di pagina**:

| Tipo di pagina | Strategia | Perché |
|---|---|---|
| Landing, città, elenchi | Statica con rigenerazione (ISR) | HTML servito dalla CDN in pochi millisecondi, dati aggiornati a intervalli |
| Profili artista, dettaglio ingaggio | Statica al build per i più popolari, generata al volo per gli altri | Non si possono pre-generare 10.000 profili a ogni deploy |
| Dashboard, feed, chat | Dinamica | Dipende dall'utente, non ha senso metterla in cache |
| Ricerca | Dinamica, `noindex` | Risultati infiniti e duplicati: pagine che Google non deve indicizzare |

**Conseguenze.** Va tenuto a mente cosa gira sul server e cosa sul client: un
`useState` in un componente server è un errore in fase di build. In cambio, le
pagine pubbliche arrivano al browser già complete e non serve un secondo
servizio per il rendering lato server.

**Limite noto.** L'App Router è recente e alcune librerie dell'ecosistema
React non lo supportano ancora bene. Se ne è già pagato il prezzo con Socket.io
(ADR-006).

---

## ADR-002 · PostgreSQL con Prisma

**Problema.** I dati sono fortemente relazionali: un utente ha post, che hanno
commenti e tag; un evento ha candidature, che collegano utenti a eventi con uno
stato. Servono transazioni (accettare una candidatura tocca più tabelle) e
query aggregate per la directory ("quanti artisti a Milano fanno il DJ").

**Alternative valutate.**

*MongoDB.* Comodo all'inizio, poi le relazioni si pagano tutte insieme.
"Elenca gli artisti di Milano con almeno un elemento nel portfolio, ordinati
per reputazione" in SQL è una query; in Mongo diventa un'aggregation pipeline o,
più spesso, denormalizzazione e dati che si disallineano.

*SQL scritto a mano.* Massimo controllo, ma nessuna sicurezza sui tipi fra
database e TypeScript. Un campo rinominato diventa un errore a runtime invece
che in fase di compilazione.

*Drizzle.* Più leggero di Prisma e più vicino a SQL. Scartato per un motivo
pratico: le migrazioni di Prisma sono più mature, e su un progetto che deve
restare comprensibile a distanza di mesi lo schema dichiarativo in un solo file
vale più della manciata di kilobyte risparmiati.

**Decisione.** PostgreSQL su Neon, con Prisma come ORM e migrazioni versionate.

**Il dettaglio che quasi tutti sbagliano.** Neon espone due connessioni:

- `DATABASE_URL` → il *pooler*, per le query a runtime. Le funzioni serverless
  aprono e chiudono connessioni in continuazione: senza pooling si esaurisce il
  limite di connessioni del database in pochi minuti di traffico.
- `DIRECT_URL` → la connessione *diretta*, per le migrazioni. Il pooler in
  modalità transazione non consente i lock sullo schema di cui `prisma migrate`
  ha bisogno, e senza questa variabile le migrazioni si bloccano **senza un
  messaggio di errore comprensibile**.

**Conseguenze.** Le migrazioni sono versionate e committate; lo script di build
esegue `prisma migrate deploy`, quindi ogni deploy allinea lo schema da solo.

**Limite noto.** Lo schema non usa enum né array nativi — le discipline sono
una stringa separata da virgole. Era una scelta di portabilità quando il target
era ancora SQLite. Ora che il target è Postgres è un compromesso superato:
`String[]` ed enum nativi darebbero query più pulite e vincoli veri a livello di
database. È debito riconosciuto, non una svista.

---

## ADR-003 · La SEO come architettura, non come plugin

**Problema.** Se il traffico dipende dalla ricerca organica, la correttezza dei
metadati non può dipendere dal fatto che chi scrive una pagina si ricordi di
aggiungerli.

**Alternativa scartata.** Un pacchetto SEO che si limita a stampare tag
`<meta>`. Non può decidere quale pagina sia canonica, non sa quali pagine hanno
abbastanza contenuto da meritare l'indicizzazione, non conosce i tuoi dati.

**Decisione.** Un costruttore unico, `buildMetadata()`, che ogni pagina è
obbligata a usare. In cambio di un parametro `path` restituisce canonical
assoluto, hreflang, Open Graph e Twitter card coerenti. **Non esiste una pagina
del progetto con metadati scritti a mano**, quindi non esiste una pagina che
possa divergere dalle altre col tempo.

Sopra ci sono tre meccanismi che valgono da soli la decisione:

**Sitemap partizionata.** Un indice verso cinque file, ognuno con la propria
frequenza di rigenerazione. Le sitemap hanno un limite di 50.000 URL, e mettere
i profili — che cambiano di rado — nello stesso file degli eventi — che cambiano
ogni ora — costringerebbe a rigenerare tutto in continuazione.

**Difesa dal contenuto povero.** 20 città × 10 discipline fanno 200 pagine, e
all'inizio sono quasi tutte vuote. Le pagine sotto una soglia configurabile
restano raggiungibili e linkate ma escono da sitemap e indice. Non è una
finezza: Google penalizza i domini che gli segnalano centinaia di pagine vuote,
e la penalità ricade anche sulle pagine buone.

**Invalidazione mirata.** Pubblicare un ingaggio chiama `revalidatePath()` sulle
quattro pagine che lo mostrano, non su tutto il sito.

**Conseguenze.** Aggiungere una pagina pubblica richiede tre passaggi:
`buildMetadata()`, l'eventuale JSON-LD, e la voce in sitemap. Più lento che
scrivere un `<title>`, ma è l'unico modo perché la centesima pagina sia corretta
quanto la prima.

---

## ADR-004 · Dati strutturati Schema.org

**Problema.** Un risultato di ricerca con data, luogo e prezzo visibili ottiene
molti più clic di un risultato con solo titolo e descrizione. Sono i *rich
result*, e per ottenerli serve markup strutturato.

**Decisione.** JSON-LD generato lato server. `Event` con `Offer` e `Place` per
gli ingaggi, `Person` — o `MusicGroup` per le band — per gli artisti, più
`BreadcrumbList`, `FAQPage` e `ItemList`.

**Perché JSON-LD e non microdata.** I microdata si intrecciano con l'HTML:
ogni modifica al layout rischia di rompere il markup semantico. JSON-LD è un
blocco separato, testabile in isolamento, ed è il formato che Google stesso
raccomanda.

**Conseguenze.** Un evento annullato passa automaticamente a
`EventCancelled` e a `noindex`: senza, resterebbe nei risultati di ricerca a
promettere una serata che non esiste più.

---

## ADR-005 · Autenticazione con Auth.js v5 e sessioni JWT

**Problema.** Servono email/password e accesso con Google, su un ambiente
serverless dove ogni richiesta può finire su un'istanza diversa.

**Alternative valutate.**

*Sessioni salvate nel database.* Revoca immediata, che è un vantaggio reale.
Ma ogni richiesta a ogni pagina diventa una query in più: su un sito con molte
pagine pubbliche è un costo che si paga di continuo.

*Clerk o Auth0.* Ottimi e rapidi da integrare. Scartati per due motivi: il
costo cresce con gli utenti proprio quando il progetto inizia a funzionare, e su
un progetto che deve dimostrare competenza tecnica delegare l'autenticazione
significa non poterla spiegare.

*Implementazione da zero.* L'autenticazione è il posto sbagliato dove essere
creativi. Gli errori non si vedono finché non è tardi.

**Decisione.** Auth.js v5 con sessioni JWT in cookie `httpOnly`.

**Le scelte di sicurezza, in dettaglio:**

- Password con bcrypt a **cost 12**: circa 250 ms per hash. Abbastanza lento da
  rendere impraticabile un attacco a dizionario, abbastanza veloce da non
  infastidire chi accede.
- I token di verifica e reset finiscono nel database **come hash SHA-256**. Se
  qualcuno legge il database, i link in circolazione restano inutilizzabili.
- Il reset password risponde **sempre allo stesso modo**, che l'account esista o
  no. Una risposta diversa trasformerebbe l'endpoint in uno strumento per
  scoprire quali indirizzi sono registrati.
- Un token già usato viene cancellato, e generarne uno nuovo invalida il
  precedente: l'ultimo link inviato è sempre l'unico valido.

**Limite noto e come si contiene.** `next-auth@5` è formalmente in beta. Non ha
un'alternativa onesta: la v4 non supporta l'App Router. La versione è **fissata
esatta**, senza `^`, perché una beta lasciata flottare può cambiare
comportamento a un semplice `npm install`. La superficie è concentrata in un
solo modulo e i test end-to-end coprono accesso, credenziali errate ed email non
verificata: se la beta rompe qualcosa, lo dicono i test prima degli utenti.

---

## ADR-006 · Chat su Server-Sent Events, non WebSocket

**Problema.** I messaggi devono arrivare senza che l'utente ricarichi.

**Alternative valutate.**

*Socket.io.* La scelta istintiva. Richiede però un server HTTP persistente a cui
agganciarsi, e l'App Router non ne espone uno: servirebbe un server custom, che
su Vercel non gira. Nel progetto precedente era installato ma non funzionante,
proprio per questo.

*Polling dal client.* Semplice e affidabile. Ma una richiesta ogni pochi secondi
per ogni utente con la chat aperta, la maggior parte delle quali non trova
niente.

*Un servizio gestito (Pusher, Ably).* Funziona bene, costa, e aggiunge una
dipendenza esterna per una funzione che non è ancora centrale nel prodotto.

**Decisione.** Server-Sent Events, che passano dalle normali route handler,
riconnettono da soli e non richiedono infrastruttura. La chat è un flusso
unidirezionale — il server manda, il client invia con una POST normale — quindi
la bidirezionalità dei WebSocket non serve.

**Il problema che rimaneva, e come è risolto.** Un bus di eventi in memoria
funziona solo dentro il processo che lo ospita. Su Vercel chi scrive e chi
ascolta finiscono quasi sempre su istanze diverse: da solo non consegnerebbe
niente.

Lo stream ha quindi **due sorgenti**:

1. Il bus in memoria — istantaneo, ma solo sulla stessa istanza.
2. Il *tailing del database* ogni 2 secondi, con un cursore temporale — copre
   tutto il resto.

Il dedup è per id, quindi un messaggio che arriva da entrambe viene mostrato una
volta sola. Latenza fra 0 e 2 secondi, correttezza garantita ovunque, zero
servizi aggiuntivi.

**Perché non Redis pub/sub, che sarebbe la risposta da manuale.** Per ricevere
eventi da Redis serve comunque una connessione persistente per istanza: su
serverless si torna al punto di partenza, con un servizio in più da pagare e
monitorare. Il database è già la fonte di verità e la query è indicizzata su
`(conversationId, createdAt)`: costa meno di quanto sembri.

**Limite noto.** Fino a 2 secondi di ritardo. Accettabile per messaggi fra
artisti e organizzatori; se la chat diventasse il cuore del prodotto, si passa a
un servizio dedicato.

---

## ADR-007 · Upload con compressione nel browser

**Problema.** Le foto arrivano dai telefoni: 4-8 MB ciascuna. Caricarle così
significa attese lunghe in mobilità, storage sprecato e pagine lente per chi le
guarda.

**Decisione.** Ridimensionamento e conversione in WebP **nel browser**, prima
dell'invio, con preset diversi per avatar, post, eventi e portfolio.

**Perché nel browser e non sul server.** Comprimere sul server significa
comunque caricare gli 8 MB originali: l'attesa dell'utente resta identica, e in
più si occupa tempo di calcolo della funzione serverless. Comprimere prima
riduce sia il tempo di caricamento sia il costo.

Le immagini più leggere ricadono direttamente su LCP, che è una delle Core Web
Vitals e quindi un segnale di ranking.

**Precauzioni.** Le GIF animate, i video e gli audio passano intatti:
ricomprimerli su canvas perderebbe animazione o traccia. Se il browser non
collabora si invia l'originale, perché un caricamento fallito è peggio di un
file grande.

**E la sicurezza resta sul server.** Il tipo MIME dichiarato dal client è
banale da falsificare: il server verifica i **magic bytes**, cioè i primi byte
del file, che devono corrispondere al formato dichiarato. La compressione è
un'ottimizzazione, non un controllo.

**Storage.** Vercel Blob, scelto perché il filesystem delle funzioni serverless
è effimero: qualsiasi file scritto su disco sparisce al deploy successivo. Il
driver è astratto dietro `storeFile()`, quindi passare a S3 o Cloudinary tocca
un file solo.

---

## ADR-008 · Rate limiting che si degrada, non che blocca

**Problema.** Registrazione, invio email e ricerca sono endpoint costosi e
appetibili per un bot.

**Decisione.** Finestra fissa per IP e per rotta, con due implementazioni dietro
la stessa firma: Redis quando è configurato, memoria altrimenti.

**Due dettagli che contano più di quanto sembri.**

*La finestra è ancorata al tempo.* La chiave contiene `floor(now / finestra)`,
quindi scade da sola: niente cancellazioni, nessuna race condition sul reset.

*Se Redis non risponde, si prosegue.* Questa è la scelta contro-intuitiva.
L'istinto dice di bloccare in caso di dubbio, ma significa che un guasto del
rate limiter diventa un guasto del sito intero. Un abuso non fermato per qualche
minuto costa meno di un sito irraggiungibile. C'è un test dedicato proprio a
questo comportamento.

**Limite noto.** Senza Redis il contatore vale per istanza: con N istanze attive
il limite effettivo è N volte quello dichiarato. Va bene per iniziare, non per
difendersi sul serio. La configurazione richiede cinque minuti.

---

## ADR-009 · Tailwind senza libreria di componenti

**Problema.** Serve un aspetto coerente senza scrivere CSS a mano per ogni
schermata.

**Alternative valutate.**

*shadcn/ui.* Popolare e ben fatto. Ma porta con sé otto pacchetti Radix, e nel
progetto precedente conviveva già con classi Tailwind scritte a mano: due
sistemi per fare la stessa cosa, che è il debito peggiore perché non si nota
finché non è ovunque.

*Material UI.* Componenti pronti, ma un aspetto riconoscibile che dice "questo è
MUI" e un peso considerevole.

**Decisione.** Tailwind con token in variabili CSS e un piccolo insieme di
classi componente (`.btn-primary`, `.card`, `.input`, `.chip`). Le primitive
mancanti — Avatar, Badge, Tabs, Carosello — sono scritte a mano, ~50 righe
ciascuna.

**Il dettaglio tecnico che rende tutto più semplice.** I colori nelle variabili
sono terne RGB nude (`--surface: 255 255 255`) invece di `rgb(...)`. Così
Tailwind può applicarci l'opacità: `bg-surface/80` funziona, senza dover
dichiarare una variabile per ogni livello di trasparenza.

**Conseguenze.** Nessun componente si comporta in modo inatteso, perché ogni
componente è leggibile per intero. Il costo è scrivere a mano ciò che una
libreria avrebbe dato pronto — accettabile su un insieme di primitive limitato.

**Cosa è stato scartato del vecchio progetto e perché.** `framer-motion` pesa
circa 50 kB gzip su ogni pagina; le stesse animazioni si ottengono con CSS a
costo zero. Su un progetto che vive di ricerca organica, mezzo megabit per far
ruotare un logo non si giustifica. `lucide-react`, invece, è stato preso: le
icone erano un buco reale ed è tree-shakeable, tanto che il bundle condiviso è
rimasto identico a prima.

---

## ADR-010 · Le transizioni di pagina non animano il primo caricamento

**Problema.** Le transizioni aiutano a capire che qualcosa è cambiato, ma
animare l'ingresso del contenuto ritarda il momento in cui il browser lo
dipinge — e quel momento è esattamente ciò che misura l'LCP.

**Decisione.** `template.tsx` anima solo le navigazioni successive. Il primo
caricamento arriva senza animazione.

**Perché è la scelta giusta.** Al primo ingresso l'utente non ha ancora un
punto di riferimento: non c'è nulla da segnalare. Alle navigazioni successive ha
appena cliccato, sa di aver chiesto qualcosa, e l'animazione conferma che sta
arrivando — su una pagina che nessuno misura.

Stesso ragionamento per gli **skeleton**: replicano il rapporto d'aspetto dei
componenti che sostituiscono, perché uno skeleton di proporzioni sbagliate fa
scattare la pagina all'arrivo dei dati, e quello scatto è Cumulative Layout
Shift — un'altra metrica di ranking.

E tutto si azzera sotto `prefers-reduced-motion`: per chi soffre di disturbi
vestibolari le animazioni possono provocare nausea vera.

---

## ADR-011 · Validazione condivisa fra client e server con Zod

**Problema.** Validare solo sul client è una falla di sicurezza; validare solo
sul server dà un'esperienza pessima, con un giro di rete per ogni errore di
battitura.

**Decisione.** Uno schema Zod per entità, usato in entrambi i posti. Il client
mostra gli errori subito, il server rivalida perché **non si fida mai** di ciò
che arriva.

Gli schemi contengono anche le regole di dominio, non solo i tipi: la fine di un
evento non può precedere l'inizio, un ingaggio retribuito deve dichiarare il
compenso minimo. Sono `.refine()`, e stanno accanto al campo che vincolano
invece che sparsi nella logica.

**Un difetto trovato dai test.** La firma originale di `parseBody` legava il
generico al tipo di output invece che allo schema: i campi con `.default([])`
risultavano `string[] | undefined` dopo il parse, costringendo a controlli
inutili. Il tipo diceva una cosa falsa. Corretto legando il generico allo
schema.

---

## ADR-012 · Strategia di test: due livelli, non tre

**Problema.** Testare tutto costa più di quanto renda; non testare niente
significa scoprire i problemi dagli utenti.

**Decisione.** Due livelli, e uno volutamente assente.

*Unitari (Vitest, 84 test)* su tutto ciò che è logica pura: costruzione dei
metadati, JSON-LD, validazione, rate limiting, curva dei livelli, slug,
distanze geografiche, permessi. Sono deterministici e girano in due secondi.

*End-to-end (Playwright, 20 test)* sui percorsi che, se si rompono, il progetto
non funziona: registrazione, accesso, navigazione — e soprattutto
**l'infrastruttura SEO**. `robots.txt` che dice `Allow`, la sitemap che usa il
dominio giusto, il canonical presente, il JSON-LD valido. Sono errori che non
rompono la build e di cui ci si accorge settimane dopo, guardando Search
Console: esattamente il tipo di cosa che un test deve intercettare.

*Test di componente: assenti, di proposito.* Verificano soprattutto che il
markup sia quello che è, si rompono a ogni ritocco di layout e raramente trovano
bug veri. Il tempo è meglio speso sugli altri due livelli.

**Vitest invece di Jest.** Legge TypeScript e i path alias di `tsconfig`
direttamente, senza una catena di trasformazioni da configurare. Jest, sullo
stesso progetto, avrebbe richiesto tre file di configurazione in più.

**Cosa hanno già trovato.** Due difetti veri durante la scrittura: la matematica
dei livelli era accoppiata al client del database e non si riusciva a importare
da sola (ora è in un modulo puro, il che toglie Prisma anche dai componenti
client), e `metaDescription` aveva una firma che impediva di passare un fallback
diverso da quello predefinito.

---

## ADR-013 · Solo italiano, con hreflang pronto ma disattivato

**Problema.** Un sito multilingua raddoppia le pagine da mantenere.

**Decisione.** Solo italiano. L'infrastruttura hreflang esiste ed è
**deliberatamente spenta**: `LOCALES = ["it"]`.

**Perché non attivarla "tanto è pronta".** Dichiarare un hreflang verso una
pagina che non esiste è un errore che Search Console segnala e che annulla il
beneficio dell'annotazione. Meglio non dichiarare niente che dichiarare il
falso.

**E perché l'italiano basta.** Il valore di ricerca sta in query come "DJ a
Milano" o "cercasi cantautore Bologna". Chi le scrive è italiano. Una versione
inglese di una directory di artisti italiani non ha pubblico.

Quando servisse, si aggiunge `"en"` a quella riga e si creano le rotte:
metadati e sitemap si aggiornano da soli.

---

## ADR-014 · Due assi di ruoli, separati

**Problema.** Un utente può essere artista o organizzatore. Ma può anche essere
moderatore. Sono cose diverse.

**Decisione.** Due campi distinti. `role` è il ruolo di prodotto: cambia cosa
vedi e cosa puoi fare nell'applicazione. `adminRole` è la moderazione, con
permessi granulari.

**Perché non un solo campo con più valori.** Perché "artista che modera" non è
un terzo tipo di utente: è un artista con un permesso in più. Mescolarli
obbligherebbe a un valore nuovo per ogni combinazione, e la matrice cresce in
fretta.

---

## ADR-015 · La validazione dell'ambiente distingue fatale da avviso

**Problema.** Una variabile d'ambiente mancante si manifesta tardi e male: non
al deploy, ma alla prima richiesta che ne ha bisogno, sotto forma di errore
incomprensibile dentro una libreria di terze parti. È successo davvero:
`AUTH_SECRET` non impostato su Vercel faceva rispondere 500 a ogni rotta
renderizzata dal server, mentre le pagine pre-generate continuavano a tornare
200. Una diagnosi che è costata tempo.

**Decisione.** Uno schema Zod in `src/lib/env.ts`, invocato una sola volta al
boot del server tramite `src/instrumentation.ts` — il punto di aggancio che
Next.js esegue prima di servire qualunque richiesta.

**Perché due livelli e non uno.** Le variabili non hanno tutte lo stesso peso.
Senza `DATABASE_URL` o `AUTH_SECRET` l'applicazione non può funzionare: il
processo deve morire subito e rumorosamente, perché un deploy fallito è meglio
di un deploy che risponde 500. Senza il token di Vercel Blob invece si perde
solo il caricamento delle immagini: bloccare l'avvio per questo significherebbe
impedire un deploy d'emergenza per una funzione secondaria. Quindi
`crossChecks()` restituisce `{ fatal, warnings }`: i primi fermano il boot, i
secondi finiscono nei log e in `/api/health`.

**Il precedente da cui viene.** La prima versione dei documenti prometteva
questa validazione, ma `getEnv()` non era chiamato da nessuna parte. Il codice
c'era, non veniva eseguito. Vale come promemoria: una funzione di controllo mai
invocata è peggio dell'assenza del controllo, perché produce fiducia falsa.

---

## ADR-016 · Sentry solo lato server

**Problema.** L'installazione predefinita di Sentry aggiunge tre file di
configurazione: server, edge e client. Il terzo porta lo SDK dentro il bundle
del browser. Il primo caricamento è passato da 103 a 191 kB — quasi il doppio,
su ogni pagina, incluse le duecento della directory locale.

**Decisione.** Rimosso `instrumentation-client.ts`. Restano server ed edge, che
girano su Vercel e non vengono scaricati da nessuno. Bundle tornato a 104 kB.

**Cosa si perde.** Gli errori JavaScript che avvengono solo nel browser — un
gestore di eventi che esplode, una libreria che fallisce su un browser vecchio.

**Perché il compromesso regge, qui.** Le pagine che portano traffico sono
statiche o rigenerate: quasi tutto ciò che può rompersi si rompe sul server, ed
è lì che Sentry guarda. Le parti veramente interattive — chat, dashboard,
caricamenti — stanno dietro autenticazione, hanno pochi utenti e sono coperte
dai test end-to-end. Ottantasette kilobyte su ogni visita anonima, per
monitorare le sessioni autenticate, è uno scambio sbagliato.

**Quando lo cambierei.** Nel momento in cui l'area privata diventasse la parte
principale del prodotto. Allora il client Sentry andrebbe caricato in modo
differito e solo dopo il login, non nel bundle comune.

---

## ADR-017 · Il contrasto si calcola, non si guarda

**Problema.** Su un tema scuro il testo secondario tende a essere impostato "a
occhio" finché sembra abbastanza leggero. È un metodo che fallisce in modo
sistematico, perché la percezione dipende dal monitor, dalla luce della stanza e
dall'aver appena guardato quel colore per dieci minuti.

**Decisione.** I token `--fg`, `--muted` e `--faint` sono verificati con la
formula di contrasto WCAG contro *tutte* le superfici su cui possono comparire,
non solo contro lo sfondo principale, e tarati sul caso peggiore.

**Cosa ha trovato la verifica.** Tre valori scelti a occhio non passavano il
livello AA:

| Coppia | Prima | Dopo |
|---|---|---|
| `--faint` su fondo chiaro | 2.86:1 | 4.75:1 |
| `--faint` su `--surface-raised` (scuro) | 3.42:1 | 4.50:1 |
| `.eyebrow` in `brand-500` su fondo chiaro | 4.06:1 | 5.47:1 (`brand-600`) |

**Il dettaglio che si sbaglia più spesso.** La soglia di 3:1 vale per il testo
grande — almeno 24px, o 18.66px in grassetto. `--faint` veste etichette da 13px,
quindi ricade nel testo normale e la soglia è 4.5:1. Applicare 3:1 perché "è
testo secondario" è l'errore che rende un'interfaccia non conforme pur avendo
fatto il controllo.

**Perché il caso peggiore e non lo sfondo.** `--faint` compare più spesso dentro
le schede che sul fondo pagina. Tarare sul fondo avrebbe certificato conforme
proprio il contesto in cui il testo è meno leggibile.

---

## ADR-018 · Un profilo entra nell'indice solo se ha qualcosa da dire

**Problema.** La difesa anti thin-content copriva le pagine di elenco — le
combinazioni città×disciplina, centinaia, quasi tutte vuote all'inizio — ma non
i profili individuali. Per finire in sitemap bastava registrarsi e verificare
l'email.

Si è visto in produzione. Fra i nove profili dichiarati a Google c'erano `kkkk`
e `il-tuo-nome`: account di prova, pagine senza una riga di contenuto,
presentate come indicizzabili proprio sul tipo di pagina su cui poggia tutta la
strategia di ricerca. Per un dominio nuovo è il danno peggiore: la valutazione
iniziale si costruisce su ciò che trova la prima scansione.

**Decisione.** Una soglia in `src/lib/profile-quality.ts`. Un profilo è
indicizzabile se dichiara almeno una disciplina **e** ha una biografia di
almeno centoventi caratteri **oppure** almeno un lavoro nel portfolio.

**Perché quelle due condizioni.** La disciplina serve perché senza di essa la
pagina non risponde a nessuna ricerca reale: nessuno cerca "un artista", si
cerca "un chitarrista a Bologna". La seconda condizione è la definizione
operativa di thin content — la pagina deve offrire qualcosa che il risultato di
ricerca non mostri già da sé. Un nome e una città stanno interamente nello
snippet: aprire la pagina non aggiunge niente.

**Perché biografia *oppure* portfolio, non entrambe.** Un musicista si racconta
scrivendo, un fotografo mostrando. Pretendere tutte e due escluderebbe metà
delle discipline per un requisito formale.

**Perché non cancellare i due account e basta.** Sarebbe una pulizia da rifare
ogni settimana, che dipende da qualcuno che se ne ricordi. Una regola nel codice
non si dimentica.

**Perché sitemap e noindex insieme.** La sitemap è un suggerimento: Google
arriva comunque dai link interni, dall'elenco degli artisti, dalle pagine di
città. Solo il `noindex` sulla pagina è vincolante. Resta `follow`, così i link
in uscita continuano a trasmettere valore: il profilo è povero, non ostile.

**La parte che non è tecnica.** La regola compare in dashboard, con l'elenco di
cosa manca e quanto. Un filtro silenzioso che penalizza senza spiegare è la
versione peggiore di una regola giusta — e per l'artista è anche l'informazione
più utile che la piattaforma possa dargli.

---

## ADR-019 · Le segnalazioni puntano a tipo + id, non a una relazione

**Problema.** Una segnalazione può riguardare un profilo, un post, un elemento
di portfolio, un ingaggio o un commento. Cinque tipi diversi, una sola coda.

**Decisione.** `targetType` (stringa) più `targetId` (stringa), senza chiave
esterna verso le tabelle segnalate.

**L'alternativa e perché è peggiore.** Cinque colonne nullable con cinque
chiavi esterne darebbero integrità referenziale, ma nello schema non si può
esprimere «esattamente una valorizzata»: servirebbe un vincolo `CHECK` scritto
a mano, che Prisma non genera e che quindi si scriverebbe una volta e si
dimenticherebbe alla migrazione successiva. In cambio si otterrebbero join che
qui non servono mai — la coda mostra un link, non i dati del contenuto.

**Cosa si perde davvero.** Il database non impedisce di inserire un
`targetId` inesistente, e cancellando un contenuto la segnalazione resta
orfana. Il secondo effetto è però voluto: se un profilo viene cancellato dopo
essere stato segnalato, la traccia della segnalazione deve sopravvivere alla
cancellazione, perché è quella che documenta *perché* è stato rimosso. Con una
chiave esterna in cascata sparirebbe proprio la prova.

**Il compromesso pratico.** `targetUrl` conserva l'indirizzo pubblico del
contenuto al momento della segnalazione. Se poi sparisce, resta scritto cosa
si stava guardando.

---

## ADR-020 · Il ruolo di moderazione si legge dal database, non dalla sessione

**Problema.** La sessione è un JWT firmato: quello che contiene resta valido
fino alla scadenza. Mettere `adminRole` nel token significa che revocare un
moderatore non ha effetto finché il suo token non scade — ore, nel caso
migliore.

**Decisione.** `role` (artista o organizzatore) resta nel token; `adminRole` si
legge dal database a ogni verifica.

**Il criterio.** Un dato che descrive *chi sei* può stare nel token: cambia di
rado e non concede poteri. Un dato che descrive *cosa puoi fare sui contenuti
altrui* no. Il costo è una lettura su chiave primaria, ed è il prezzo giusto
per una revoca che ha effetto subito.

**Effetto collaterale utile.** `hasPermission` esisteva da tempo e non era
invocata da nessuna parte — la terza funzione orfana trovata in questo
progetto, dopo `getEnv()` e la cancellazione dell'account promessa
dall'informativa. Ora ha un chiamante.

---

## ADR-021 · Segnalare non richiede un account

**Problema.** Il Digital Services Act impone un meccanismo di «notice and
action» accessibile a chiunque. Riservarlo agli iscritti sarebbe più comodo:
meno spam, un'identità dietro ogni segnalazione, nessuna rotta pubblica in
scrittura.

**Decisione.** La rotta accetta segnalazioni anonime. L'email di chi segnala è
facoltativa e serve solo a ricevere l'esito.

**Perché.** Chi arriva da una ricerca, incappa in un contenuto illecito e non
ha alcun rapporto con la piattaforma è la persona *meno* disposta a registrarsi
e la *più* attendibile: non ha dissapori in corso con nessuno. Obbligare
all'account significa ricevere meno segnalazioni proprio dalla fonte migliore.

**Il prezzo, e come si paga.** Una rotta pubblica in scrittura è un bersaglio.
La difesa è il limite di richieste: sei all'ora per indirizzo — abbastanza per
segnalare un profilo e i suoi contenuti in una sessione, poco per sommergere la
coda. La risposta è sempre la stessa a prescindere dall'esito: dire «già
segnalato» trasformerebbe la rotta in uno strumento per sondare cosa è sotto
esame.

**Il vincolo che il codice impone.** La motivazione è obbligatoria per chiudere
una segnalazione. La norma chiede un trattamento «non arbitrario»: una
decisione senza motivo scritto non è verificabile da nessuno — né da chi ha
segnalato, né da chi ha subito la rimozione, né da chi moderasse dopo.

---

## ADR-022 · Rimuovere significa nascondere, non cancellare

**Problema.** Accogliere una segnalazione senza toccare il contenuto è teatro:
la coda si svuota e il materiale resta online. Ma cancellarlo è irreversibile.

**Decisione.** Accogliere può rendere il contenuto non visibile — `isPublic` a
falso — e la spunta è attiva per impostazione predefinita. Il contenuto resta
nel database e nell'account di chi l'ha pubblicato.

**Tre ragioni, in ordine di peso.**

1. Una decisione di moderazione si può sbagliare, e il Digital Services Act
   prevede esplicitamente che sia contestabile. Un contenuto cancellato non si
   ripristina: il reclamo diventerebbe una formalità senza rimedio.
2. Se la segnalazione riguarda qualcosa di illecito, il contenuto è anche una
   prova. Distruggerla è il contrario di ciò che serve.
3. La sanzione è la visibilità, non l'espropriazione: chi ha pubblicato
   mantiene accesso al proprio materiale.

**Perché l'oscuramento è separato dall'esito.** Non tutte le segnalazioni
fondate richiedono una restrizione: una che denuncia un dato sbagliato si
accoglie e si corregge. Legare le due cose lascerebbe a chi modera solo la
scelta fra ignorare e nascondere, togliendo la misura intermedia.

**L'eccezione dichiarata.** I commenti non hanno un campo di visibilità, quindi
l'unica misura possibile è la cancellazione. È un limite dello schema, non una
scelta, ed è scritto nel codice dove chi modera lo può leggere.

---

## ADR-023 · La motivazione è dovuta anche a chi subisce la rimozione

**Il difetto che questa decisione corregge.** La prima versione del sistema di
segnalazione inviava la motivazione a chi aveva segnalato, e a nessun altro.
Sembrava completo: la norma parla di riscontro a chi segnala, e quello c'era.

Non è completo. L'articolo 17 del Digital Services Act impone una «statement of
reasons» a chi subisce la restrizione — deve sapere cosa è stato rimosso,
perché, su quale base, e come contestarlo. È l'obbligo più facile da
dimenticare proprio perché l'attenzione va naturalmente a chi ha segnalato,
che è la persona con cui si sta interagendo.

**Decisione.** Quando una restrizione viene effettivamente imposta, l'autore
riceve un'email con il contenuto interessato, il motivo della segnalazione, la
motivazione della decisione, e l'indicazione esplicita che può contestarla
rispondendo.

**Il dettaglio che rende la regola corretta.** L'avviso parte solo se la
restrizione c'è stata davvero. Accogliere una segnalazione senza oscurare non
impone nulla all'autore, e mandargli un messaggio su un contenuto ancora online
sarebbe soltanto confusione.

**Perché conta più di quanto sembri.** Rimuovere in silenzio è esattamente il
comportamento che la norma vieta: chi si vede sparire un contenuto senza
spiegazione non può capire se ha sbagliato, correggersi, o difendersi da una
decisione errata.

---

## ADR-024 · I test verificano dove si finisce, non che le pagine esistano

**Il fatto da cui nasce.** In un solo pomeriggio sono emersi cinque difetti,
tutti sul percorso che dà senso al sito, tutti presenti da settimane:

1. La sessione sembrava scadere — il middleware non riconosceva il cookie
   quando Auth.js lo spezzava in più parti.
2. Il login perdeva la destinazione: la query non veniva conservata, e chi
   cliccava «Contatta» finiva nell'elenco vuoto dei messaggi.
3. Lo stesso difetto sull'altra metà dell'imbuto: «Accedi per candidarti»
   riportava all'elenco degli ingaggi, non a quello letto.
4. Il parametro di ritorno era un *open redirect*, sfruttabile per phishing.
5. Dopo che una candidatura veniva accettata, le due parti non avevano un modo
   di scriversi.

**Perché nessun controllo li aveva visti.** La suite copriva autenticazione,
navigazione e SEO — le parti che si scrivono per prime — e verificava che le
pagine rispondessero. Le pagine rispondevano tutte. Nessuno di questi difetti
sta *dentro* una pagina: stanno nei passaggi fra una pagina e l'altra, che è
esattamente ciò che un utente percorre e un test per pagine non guarda mai.

Il typecheck non poteva vederli: `pathname` senza `search` è una stringa
valida. Il lint nemmeno. La revisione umana li aveva letti e approvati.

**Decisione.** I test end-to-end del percorso critico verificano **dove si
finisce**, non che qualcosa esista. Ogni passaggio importante ha un test che
segue l'utente da una pagina alla successiva e controlla che arrivi dove
voleva andare, con il contesto che si portava dietro.

**Il criterio operativo.** Se un test si può soddisfare rispondendo 200, non
sta verificando niente di ciò che rompe l'esperienza. La domanda giusta non è
«questa pagina funziona» ma «da qui, dove finisco».

**Cosa resta scoperto, e va detto.** Il difetto del cookie spezzato è
difficile da riprodurre in un test end-to-end, perché richiede un token oltre i
quattromila byte. Per quello la logica è stata estratta in una funzione pura e
coperta da test unitari, compresi i casi in cui un confronto troppo largo
accetterebbe il token CSRF che sta lì accanto.

---

## ADR-025 · La reputazione misura l'affidabilità, non l'attività

**Contesto.** `/artisti` ordina i risultati con
`orderBy: [{ reputation: "desc" }]`. Quel campo decide chi vede per primo un
organizzatore che cerca un chitarrista a Bologna: è la posizione più preziosa
che il prodotto abbia da assegnare, e l'unica cosa che un utente possa
davvero desiderare da noi.

Il punteggio si accumulava completando quest. Ogni obiettivo aveva un
`repReward`, e `grantXp(userId, xp, reputation)` sommava entrambi i valori
senza mai sottrarne. Tradotto: **la directory era ordinata per quanto una
persona avesse usato il sito.** Chi passa un pomeriggio a spuntare obiettivi
scavalca un musicista bravo iscritto la settimana prima. E con le
registrazioni aperte a chiunque (ADR-018) il modo più veloce per stare in cima
diventava fare rumore — che è esattamente il comportamento che una directory
di professionisti non deve premiare.

C'era anche un difetto meccanico sotto quello concettuale: essendo
incrementale, il punteggio non poteva scendere. Chi cancellava metà del
portfolio si teneva i punti guadagnati caricandolo.

**Decisione.** La reputazione non si accumula più: si **calcola** da fatti
verificabili, e si **ricalcola** quando quei fatti cambiano.

`src/lib/reputazione.ts` è una funzione pura da uno stato a un punteggio, con
otto voci e un massimo di 110:

| Voce | Max | Perché |
| --- | --- | --- |
| Ingaggi confermati | 20 | L'unica voce assegnata da qualcun altro |
| Identità verificata | 15 | La assegniamo noi, con riscontro |
| Profilo compilato | 15 | Foto, headline, città: ciò che si vede in elenco |
| Biografia | 15 | A scaglioni: 120 / 200 / 400 caratteri |
| Portfolio | 15 | Fino a cinque lavori, tre punti l'uno |
| Indirizzo confermato | 10 | Soglia minima di esistenza |
| Discipline dichiarate | 10 | Una o due: sono le chiavi di ricerca |
| Ingaggi organizzati | 10 | La stessa cosa, per chi pubblica annunci |

Tre proprietà tengono in piedi la scelta, e sono quelle coperte dai test:

**Ogni voce ha un tetto.** Il sesto lavoro nel portfolio e la decima disciplina
non valgono niente. Senza tetti, il modo più rapido di salire tornerebbe a
essere ripetere un'azione — cioè il difetto di prima con altri numeri.

**Nessuna voce vale più di un quinto del totale.** Non si arriva in cima
grazie a una cosa sola.

**Gli ingaggi confermati pesano più di tutto il resto per unità**, perché sono
l'unica riga che non dipende da chi la riceve: la assegna un organizzatore
scegliendo quella persona. È il segnale più difficile da falsificare, quindi
il più prezioso.

**Ricalcolare, non incrementare.** Un contatore incrementale diverge dalla
realtà al primo caso non previsto — un lavoro cancellato, una candidatura
ritirata, un profilo svuotato — e resta alto senza che niente lo rilevi,
perché non c'è nulla con cui confrontarlo. Ricalcolando, il punteggio è per
costruzione una funzione dello stato attuale: se svuoti il profilo scende, e
questa è la parte che rende il numero onesto. Il costo è una query in più nei
tre punti in cui quei fatti cambiano — candidatura accettata, profilo
salvato, portfolio modificato — non a ogni pagina.

**Il file è diviso in due** perché `reputazione.ts` viene importato anche da
componenti client (le schede in elenco leggono il massimo per mostrare la
scala): tirarsi dietro Prisma da lì spedirebbe al browser la logica di accesso
al database. Le query stanno in `reputazione-server.ts`.

**Il punteggio si spiega.** `dettaglioReputazione` restituisce le voci, non
solo il totale, e ogni voce porta con sé la frase che dice come ottenerla. Un
numero che decide la tua posizione in una directory e non dice come si ottiene
è indistinguibile dall'arbitrio. Dirlo per intero non apre a nessuno
sfruttamento proprio perché ogni voce misura uno *stato* e non un conteggio di
azioni: l'unico modo di alzarlo è fare davvero le cose che rendono un profilo
affidabile.

**Cosa resta all'XP.** Il livello continua a salire con l'attività e va
benissimo: è un progresso personale, sta nell'area privata, non decide niente
per nessun altro. I due assi ora sono separati davvero — uno motiva chi lo
guarda, l'altro informa chi cerca — e la separazione è stata portata fino
all'interfaccia: il livello è sparito dalle schede pubbliche, dalla pagina
profilo, dall'immagine social e dalla riga del candidato, dove diceva a un
organizzatore quanto quella persona usa il sito. Al suo posto, dove serviva un
segnale, c'è la reputazione **con la sua scala**: «84/110» è un'informazione,
«84» da solo non lo è.

**Conseguenze.** I valori già in tabella sono il residuo della vecchia regola e
vanno riallineati una volta sola:
`npm run reputazione:ricalcola` (con `-- --prova` per vedere senza scrivere).
Lo script è idempotente perché calcola dallo stato: si può rilanciare dopo ogni
modifica ai pesi. È in TypeScript e non in SQL apposta — riscrivere scaglioni e
tetti in una migrazione significherebbe due copie della stessa regola, che
divergono alla prima modifica.

**Alternative scartate.** Un punteggio bayesiano su recensioni reciproche
sarebbe più informativo, ma richiede un volume di transazioni che il sito non
ha ancora: con dieci ingaggi totali produrrebbe una classifica casuale
travestita da statistica. Si può aggiungere quando ci sarà di che calcolarla,
e le voci attuali restano valide come base.

---

## Cosa rifarei diversamente

Tre cose, dette senza giri di parole:

**Lo schema senza enum né array nativi.** Nato per la portabilità da SQLite,
oggi che il target è Postgres è solo un compromesso in meno di leggibilità e
vincoli. Le discipline dovrebbero essere `String[]` e gli stati degli enum veri,
controllati dal database e non solo dal codice.

**Il monitoraggio degli errori, dal primo giorno.** Sentry richiede mezz'ora.
Senza, un 500 in produzione si scopre solo se qualcuno lo segnala — e la maggior
parte delle persone non segnala, se ne va.

**I test scritti prima, non dopo.** Sono stati aggiunti a lavoro avanzato e
hanno subito trovato due difetti di progettazione. Scritti prima li avrebbero
prevenuti invece che diagnosticati: quei due difetti erano problemi di *design*
delle firme, il genere di cosa che si nota scrivendo il test per primo.
