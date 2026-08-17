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

## ADR-026 · Colori che significano, e date che si leggono

**Contesto.** Due dettagli piccoli che nell'uso quotidiano pesano più di
qualunque schermata nuova.

**Lo stato di una candidatura era sempre della stessa pillola viola.** «In
attesa», «Confermata» e «Rifiutata» avevano lo stesso identico aspetto in un
elenco dove lo stato è l'unica informazione che conta: bisognava leggere ogni
riga per sapere com'era andata. Un elenco così non si scorre, si spoglia.

**Le date erano sette `toLocaleDateString("it-IT")` sparsi**, che producono
«2/8/2026»: corretto e illeggibile. Una data numerica va decodificata; «2 ago»
si legge.

**Decisione — i colori.** Due tinte semantiche nuove, `esito.ok` ed
`esito.attesa`, con quattro scelte dietro:

*Non riusare `gold`.* L'oro nel progetto significa **compenso**, e vale
proprio perché significa una cosa sola. Usarlo anche per «in attesa»
risparmierebbe due valori esadecimali al prezzo di quella regola.

*Nessun rosso.* Un «no» a una candidatura non è un errore né un pericolo. In
un elenco che si guarda ogni giorno, il rosso lo farebbe sembrare più grave di
quanto sia. I rifiuti restano neutri e spenti, che è come vanno letti.

Il rosso non sparisce dal progetto, però: resta nella coda di moderazione, sul
bordo delle segnalazioni urgenti, e sulle azioni distruttive. È coerente, non
contraddittorio — il rosso segnala un pericolo, e una candidatura respinta non
lo è mentre un contenuto illecito da valutare sì. Un colore riservato a una
cosa sola conserva il proprio significato; usato ovunque lo perde, ed è
esattamente ciò che è successo alla pillola viola che marcava indistintamente
tutti e quattro gli stati.

*I valori stanno in `globals.css`, non nel config di Tailwind*, perché
cambiano con il tema come tutte le altre superfici. Servono due variabili per
tinta — `-testo` e `-tinta` — perché il verde leggibile su bianco è troppo
scuro per essere un fondo, e quello giusto come fondo è illeggibile come
testo. I rapporti sono stati misurati **sopra la pillola tinta al 10%**, non
sul fondo nudo: 6.20:1 e 5.77:1 nel caso peggiore, contro i 4.43:1 e 4.09:1
che davano i verdi e gli ambra scelti a occhio. È lo stesso errore già
corretto su `--faint`: un colore che passa il criterio AA sul fondo può
fallirlo dentro il componente in cui verrà davvero usato.

*Il colore non è mai l'unico segnale.* Ogni pillola porta un punto colorato
**e** il testo dello stato. Lo stesso vale per i messaggi non letti, dove il
grassetto, il pallino e un `aria-label` dicono la stessa cosa in tre modi.

**Decisione — le date.** Un modulo `src/lib/date.ts`, puro, con tre funzioni:
`dataBreve` («2 ago», e l'anno solo quando non è quello corrente, perché
ripeterlo su ogni riga è rumore), `dataOra` per le schede dove l'orario serve,
`quandoRelativo` («ieri», «3 giorni fa») per le cose recenti — un messaggio
ricevuto ieri si capisce meglio come «ieri» che come «1 ago», ma oltre la
settimana la data torna a essere più utile della distanza.

**Conseguenze.** `quandoRelativo` dipende da `Date.now()`, quindi in un
componente client può in teoria divergere fra server e browser: solo a cavallo
della mezzanotte, e per una parola. Il fuso non è fissato, quindi il server
rende in UTC e il client nel proprio: irrilevante oggi perché quelle pagine
sono dinamiche o rigenerate ogni ora, ma se comparisse una data sbagliata di
un giorno, si risolve fissando `timeZone: "Europe/Rome"` in un posto solo. È
esattamente il motivo per cui le date sono passate da sette chiamate sparse a
un modulo.

---

## ADR-027 · Un sito solo, che sotto i 640px cambia forma

**Contesto.** Da telefono il sito aveva difetti che nessun controllo
automatico poteva vedere, perché tutta la suite girava a 1280px — la
larghezza a cui non esistono. Su un progetto che vive di ricerca organica è
l'inversione peggiore possibile: **la larghezza a cui il sito funziona meno
bene è quella da cui viene visto di più.**

Sono cinque, e vale la pena elencarli perché hanno nature diverse.

**«Accedi» spariva sotto i 640px** (`hidden sm:inline-flex`). L'unico pulsante
rimasto invitava a iscriversi chi aveva già un account.

**L'intestazione non sapeva se avevi la sessione aperta.** Mostrava «Accedi /
Iscriviti» sempre, anche a sessione valida. Chi usciva dalla dashboard per
guardare un profilo leggeva un sito che lo invitava a iscriversi, e la
conclusione naturale era «sono stato disconnesso». La sessione dura un anno:
il problema non era mai stato l'autenticazione, era che il sito pubblico non
se ne accorgeva. È il difetto più insidioso dei cinque, perché il sintomo
percepito (*«mi disconnette»*) puntava a un sottosistema che funzionava.

**Ogni campo faceva ingrandire la pagina.** Safari su iOS ingrandisce da solo
quando riceve il fuoco un campo con testo sotto i 16px, e non torna indietro.
I campi erano a 14px: accesso, registrazione, pubblicazione di un ingaggio —
ogni modulo del sito faceva saltare l'inquadratura al primo tocco.

**I pannelli di navigazione non scorrevano.** Con il corpo bloccato a
`overflow: hidden` mentre il menu è aperto, su uno schermo da 568px le ultime
voci erano visibili ma irraggiungibili. Nella dashboard, fra quelle voci,
c'era «Esci».

**La mappa era alta 520px fissi**, su un telefono alto 667.

**Decisione.** Un solo insieme di pagine, che sotto i 640px cambia forma.

L'alternativa che sembra più diretta — un sito mobile separato, `m.dominio` —
è quella che il settore ha abbandonato quando Google è passato
all'indicizzazione mobile-first: significa due URL per ogni contenuto, quindi
canonical incrociati da mantenere, contenuto duplicato da spiegare al crawler,
e ogni modifica fatta due volte. Su un progetto la cui intera strategia è
comparire nei risultati di ricerca, è il difetto peggiore che si possa
introdurre di proposito.

Anche scegliere i componenti a runtime in base alla larghezza è stato
scartato: il markup verrebbe deciso dopo l'idratazione, quindi sfarfallio per
chi guarda e una versione sola per chi indicizza.

Quattro scelte meritano una nota, perché in ognuna la strada breve era la
sbagliata:

**16px sui campi, non `maximum-scale=1`.** La seconda risolve il problema
disattivando lo zoom per tutti, cioè risolve un fastidio togliendo a chi non
ci vede bene l'unico strumento che ha. È esplicitamente contraria al criterio
WCAG 1.4.4. C'è un test che verifica che quella scorciatoia non rientri di
nascosto.

**44px di bersaglio minimo.** Viene dalle linee guida Apple. Il criterio WCAG
2.5.8 ne chiede 24, che è la soglia per non fallire un audit, non una misura
a cui si tocca bene.

**`dvh` e non `vh`.** Su iOS `vh` misura la finestra *senza* la barra degli
indirizzi: un elemento a `100vh` finisce parzialmente coperto proprio mentre
si scorre. `dvh` segue l'altezza reale.

**L'avatar arriva da `useSession()`, non da `await auth()` nel layout.** La
seconda è una riga sola, e renderebbe **dinamica ogni pagina del sito**:
leggere i cookie nel layout radice disattiva la generazione statica ovunque.
Le pagine di città e i profili sono generati staticamente e rigenerati ogni
ora, ed è ciò su cui poggia tutta la strategia di ricerca. Scambiare quello
per un avatar in alto a destra sarebbe un pessimo affare. Il prezzo della
scelta giusta è che per un istante non sappiamo chi sei, e quell'istante va
gestito: durante il caricamento non si mostra né «Accedi» né l'avatar, ma un
segnaposto della stessa larghezza — mostrare «Accedi» a chi è autenticato e
poi sostituirlo darebbe lo stesso messaggio sbagliato, per giunta
lampeggiante.

**Su quali telefoni si verifica.** Qui c'era un secondo difetto, dentro la
verifica stessa. La configurazione aveva due progetti, `chromium` e `mobile`
(un Pixel 7), ma la CI lanciava `--project=chromium`: il profilo mobile non
veniva **mai** eseguito. E anche se lo fosse stato, un Pixel 7 in Playwright è
Chromium con una finestra più stretta — mentre i difetti appena corretti sono
quasi tutti specifici di WebKit. Erano corretti e verificati su un motore che
non li riproduce, che è un modo elegante di non averli verificati.

Ora i profili sono quattro: desktop, `android` (Pixel 7, Blink), `iphone`
(iPhone 13, WebKit) e `iphone-se` (WebKit a 320px). Su iOS il motore è
obbligatorio per tutti i browser — anche Chrome e Firefox per iPhone sono
WebKit sotto — quindi un solo profilo copre l'intera famiglia. La CI installa
entrambi i motori ed esegue tutti i progetti.

Tre profili e non dieci perché ciò che distingue un telefono da un altro, per
un sito, è il **motore** e la **larghezza**: un Galaxy S23 e un Pixel 7
eseguono lo stesso Blink a larghezze quasi identiche, e aggiungerlo
raddoppierebbe il tempo della suite per ripercorrere gli stessi rami di
codice. `iphone-se` non è un telefono diffuso: è il limite inferiore in cui le
cose si rompono.

**Conseguenze.** `tests/e2e/mobile.spec.ts` non nomina nessun dispositivo: le
larghezze vengono dai progetti, e sul profilo desktop i test si saltano da
soli. Verificano che si possa *fare qualcosa* — raggiungere le sezioni,
accedere, toccare i bersagli, leggere senza trascinare la pagina di lato — e
non l'aspetto, perché un test che si rompe a ogni ritocco grafico viene
disattivato dopo la terza volta, e da quel momento non protegge più niente.

Resta scoperto lo zoom di iOS in sé: Playwright non lo simula nemmeno su
WebKit, quindi il test controlla la causa (la dimensione calcolata del
carattere) e non l'effetto. E restano fuori le tastiere di sistema vere, la
memoria e la rete reali: questi profili trovano i difetti di layout e di
interazione, non quelli di prestazione — per quelli ci sono i Core Web Vitals
raccolti sul traffico vero.

---

## ADR-028 · Un `loading.tsx` si applica anche dove non deve

**Contesto.** La suite segnalava che `/artisti/uno-slug-inventato` risponde
`200` invece di `404`. Misurato in produzione: stato 200, titolo «Profilo non
trovato», e nel corpo servito «Caricamento in corso».

La causa è una regola di Next che non si vede leggendo il file: un
`loading.tsx` non vale per la pagina accanto a cui sta, ma per **tutto il
segmento** — `/artisti` e ogni suo figlio, `/artisti/[slug]` compreso. Con un
confine di Suspense sopra di sé, la pagina del profilo comincia a inviare lo
scheletro prima di sapere se il profilo esiste; con il primo byte parte anche
il codice di stato, e quando `notFound()` scatta il 200 è già stato spedito.

È un *soft 404*, ed è un difetto SEO proprio su questo progetto: Google li
tratta come pagine di bassa qualità, e con le registrazioni aperte ogni
indirizzo sbagliato ne produceva uno. Il danno era in parte contenuto dal
`noindex` che `generateMetadata` mette già quando il profilo non esiste — ma
un `noindex` chiede di non indicizzare, mentre un 404 dice che la pagina non
c'è: sono due affermazioni diverse, e ai crawler che non sono Google conta
solo la seconda.

**Decisione.** Il confine si dichiara dove serve. `loading.tsx` diventa un
componente normale, `SkeletonArtisti`, usato come `fallback` di un
`<Suspense>` **dentro** la pagina dell'elenco. Il profilo non ha più confini
sopra di sé e può rispondere 404 prima di scrivere qualunque cosa.

Il `<Suspense>` porta una chiave costruita sui parametri di ricerca: senza,
React riusa il confine già risolto quando si cambia disciplina, l'elenco resta
immobile finché i nuovi dati non arrivano, e sembra che il clic non abbia
funzionato.

**Conseguenze.** Ogni futuro `loading.tsx` va valutato per il sottoalbero che
copre, non per la pagina accanto a cui si trova. La regola pratica: va bene
solo in una cartella che non ha rotte figlie, o dove tutte le figlie possono
permettersi di rispondere 200.

**Cosa insegna.** È lo stesso schema di quasi tutti i difetti di questo
progetto: la comodità che non chiede di pensare. `loading.tsx` esiste proprio
per non dover decidere dove mettere il confine — e il prezzo è che il confine
finisce anche dove fa danno, in silenzio, senza un errore di tipo né un
avviso.

---

## ADR-029 · I test non possono scrivere sul database vero

**Contesto.** `percorso-critico.spec.ts` compila davvero il modulo di
registrazione. È una scelta voluta: il difetto peggiore mai trovato su questo
sito era che chi si iscriveva finiva davanti a un modulo di accesso senza una
parola, e l'unico modo di accorgersene è arrivare in fondo al percorso. Un
test che si ferma prima non lo vede.

Il prezzo è che ogni esecuzione crea account veri — uno per profilo del
browser, quindi quattro a giro. E `DATABASE_URL` punta a Neon.

Nessuno se ne è accorto per settimane, perché quegli account **non compaiono
da nessuna parte**: `PROFILO_PUBBLICO` richiede l'email confermata e quella
non lo sarà mai. Il sito sembrava pulito mentre la tabella si riempiva. È
venuto fuori da un numero di contorno in `/api/health` — gli utenti erano
passati da 9 a 18 in un pomeriggio — notato mentre si verificava
tutt'altro.

**Decisione.** `npm run test:e2e` esegue prima un controllo che rifiuta di
partire se non è stato **dichiarato** un database su cui i test possono
scrivere: `E2E_DATABASE_URL`.

*La prima versione di questo controllo era sbagliata, e vale la pena dirlo
perché l'errore è istruttivo.* Guardava l'hostname cercando parole come
`test` o `staging`. Non funziona con Neon: gli endpoint hanno nomi
autogenerati — `ep-sweet-cloud-agamab83` — e **il nome del branch non compare
nell'indirizzo**. Un branch creato apposta per i test sarebbe stato rifiutato
esattamente come la produzione, e il primo tentativo di usarlo lo avrebbe
dimostrato.

Il difetto di fondo non era la lista di parole: era voler *indovinare* le
intenzioni da una stringa. Un controllo che deduce può sbagliare in entrambi i
versi; uno che chiede, no. Ora l'intenzione si dichiara, e non resta niente da
interpretare.

Restano due protezioni contro l'errore distratto: un database su `localhost`
passa senza dichiarazioni, perché non è di nessuno; e se `E2E_DATABASE_URL`
è *identica* a `DATABASE_URL` il controllo blocca, perché è l'errore di chi
copia la riga sbagliata e non se ne accorge.

La via d'uscita esiste — `E2E_CONSENTI_DB_PRODUZIONE=1` — ed è volutamente
lunga e scomoda: deve costare più che creare un branch su Neon, che richiede
pochi secondi.

**Il dettaglio che rendeva tutto inutile.** Dichiarare la variabile non basta:
`playwright.config.ts` deve passarla al server dei test al posto di
`DATABASE_URL`, e i file `.env` Node non li legge da solo. Senza quelle due
righe il controllo avrebbe detto di sì e le scritture sarebbero andate
comunque in produzione — cioè il difetto di partenza, con in più la
convinzione di averlo risolto. È la variante peggiore: una difesa che si vede
e non c'è.

**Perché un controllo e non una riga di documentazione.** È lo schema che si
ripete in quasi tutti i difetti di questo progetto: la regola esisteva, era
scritta da qualche parte, e non era applicata da niente. Il canonical, la
soglia di indicizzazione, la conferma prima di cancellare, i 16px sui campi.
Ogni volta che una regola vive solo in un commento, prima o poi qualcuno fa
il contrario senza accorgersene — e quel qualcuno, il più delle volte, è chi
l'ha scritta.

**Conseguenze.** Serve un branch dedicato per far girare la suite in locale.
`npm run pulisci:e2e` rimuove i residui già accumulati: cancella solo gli
indirizzi che corrispondono al formato generato dai test e mai un account con
un ruolo di moderazione. In CI non cambia niente: il database di servizio è
su `localhost` e passa il controllo.

**Cosa resta scoperto.** Il controllo guarda l'host, non i dati: un branch
Neon chiamato `test` che per errore contiene la copia della produzione
passerebbe. È un limite accettabile — protegge dall'errore distratto, non da
quello deliberato.

---

## ADR-030 · Il filtro sui caricamenti lascia passare quando non sa

**Contesto.** Con le registrazioni aperte a chiunque, un account nuovo può
caricare fino a quindici megabyte di qualunque cosa, e il file finisce su un
dominio indicizzato con un indirizzo pubblico. Il Digital Services Act è
coperto sul lato **reattivo** — chiunque può segnalare, c'è una coda, ogni
decisione porta una motivazione (ADR-019, 020, 023). Ma il reattivo interviene
*dopo*: il contenuto è già online, e su un dominio giovane basta poco per
rovinarne la reputazione.

**Decisione.** Una classificazione automatica prima del salvataggio, con tre
scelte che vanno tutte contro l'istinto.

**Il controllo sta prima che il file esista.** Sarebbe più semplice salvare e
poi controllare l'URL — il servizio accetta anche quello. Ma un contenuto
respinto non deve avere un indirizzo pubblico nemmeno per i pochi secondi che
servono a controllarlo: quei secondi bastano a farlo raggiungere da chi sa
dove guardare.

**Se il servizio non risponde, il file passa.** Sembra la scelta debole. È la
stessa di ADR-011 sul rate limiter: un componente accessorio che va giù non
deve rendere inutilizzabile il prodotto. Un fornitore in avaria bloccherebbe
*ogni* caricamento del sito, trasformando un disservizio di terzi in un guasto
nostro — e il contenuto resta comunque segnalabile.

**Le soglie sono alte, non basse.** I classificatori restituiscono
probabilità, non verdetti, e una soglia bassa blocca le fotografie di danza
contemporanea, che qui sono contenuto legittimo e frequente. Fra i due errori,
su una piattaforma di artisti, il falso positivo è più costoso: bloccare il
lavoro di qualcuno che ha appena accettato di iscriversi è il modo più rapido
di perderlo, e non torna. Il falso negativo resta segnalabile da chiunque.

**Il parsing della risposta è difensivo.** La forma dei dati appartiene a un
servizio esterno e può cambiare senza preavviso: un campo mancante vale «non
lo so» e quindi lascia passare — non «zero», che darebbe lo stesso risultato
ma per caso, e che smetterebbe di funzionare in silenzio il giorno in cui il
fornitore rinomina una chiave.

**Conseguenze.** Due variabili facoltative. Senza, i caricamenti non vengono
classificati e `/api/health` lo dichiara: la mancanza non è silenziosa, ed è
la differenza fra una scelta e una dimenticanza.

**Cosa non copre, e va detto.** Solo le immagini: video e audio costano molto
di più da analizzare e sono una frazione dei caricamenti. Non riconosce il
diritto d'autore, che è un problema diverso e non automatizzabile a questo
livello. Non sostituisce la moderazione umana — alza la soglia d'ingresso, e
basta.

---

## ADR-031 · I dati del titolare stanno nel codice, non nell'ambiente

**Contesto.** I riferimenti del titolare del trattamento erano segnaposto
dentro il testo di `/privacy` e `/termini`: due pagine, quattro punti diversi,
evidenziati in giallo. Il rischio non era dimenticarne uno — era compilarne
tre su quattro e credersi a posto, perché il giallo residuo sta a metà di una
pagina lunga che nessuno rilegge.

**Decisione.** Un file solo, `src/lib/titolare.ts`, con cinque campi. Le
pagine lo leggono, e l'avviso «da completare» compare e sparisce da solo
secondo `titolareCompleto()`.

**Perché non variabili d'ambiente**, che sarebbe la scelta istintiva. Due
motivi. Questi dati non sono un segreto: compaiono per intero su una pagina
pubblica, ed è esattamente il loro scopo. E sono un **contenuto legale
versionato** — sapere da quando l'informativa dichiarava un certo titolare è
il genere di cosa che serve proprio quando c'è una contestazione, e la
cronologia di git è l'unico posto in cui quella risposta esiste. Una variabile
su Vercel si cambia senza lasciare traccia di quando e di cosa c'era prima.

**Conseguenze.** Compilare quel file richiede un commit e un deploy, che per
un dato che cambia una volta ogni anni è il costo giusto. L'avviso resta
finché anche un solo campo è vuoto: un titolare senza indirizzo o senza
contatto non è identificabile, e un'informativa che non identifica il titolare
non è opponibile a nessuno.

---

## ADR-032 · `sticky` va sulla colonna, non su un pezzo di colonna

**Contesto.** Nella barra laterale dell'area personale `sticky top-24` stava
sull'elenco delle sezioni. Sotto quell'elenco, dentro la stessa `nav`, ci sono
«Esplora il sito» e «Esci». Scorrendo una pagina lunga il primo restava fermo
e gli altri due scorrevano via **sotto di lui**: testo stampato su altro
testo, «Ingaggi» sovrapposto a «Esci», l'ordine delle voci apparentemente
mescolato. Non un'imprecisione di qualche pixel — due elementi leggibili nello
stesso punto.

**Perché era finito lì.** La `nav` è una cella di griglia, e una cella di
griglia si allunga fino all'altezza della riga. Un elemento alto quanto la
colonna del contenuto non ha margine entro cui scorrere, quindi `sticky` sulla
`nav` non faceva niente: spostarlo sull'elenco, che invece è alto quanto il
proprio contenuto, «funzionava». Funzionava per la metà del menu che qualcuno
aveva guardato.

**Decisione.** `sticky` sulla `nav`, con `self-start` che le restituisce
l'altezza del proprio contenuto, più `max-h` e `overflow-y-auto` per lo
schermo basso — un menu appiccicato più alto della finestra nasconde le ultime
voci senza modo di raggiungerle.

**La regola.** `position: sticky` applicato a una parte di un gruppo che
scorre insieme stacca quella parte dal resto. Se le voci vanno tenute insieme,
l'elemento appiccicato è il loro contenitore comune — e se il contenitore non
si appiccica, la causa è quasi sempre che qualcosa gli sta imponendo
un'altezza, non che `sticky` non funzioni.

---

## ADR-033 · Il tempo passa anche per gli annunci

**Contesto.** In «Ingaggi che organizzi» comparivano tutti gli annunci
pubblicati, dal più recente. In produzione questo significava vedere un
ingaggio del **3 marzo 2024** presentato esattamente come uno aperto: stessa
scheda, stesso pulsante «Gestisci», stessa riga «0 candidature» — il cui
commento nel codice diceva testualmente che serve a comunicare «l'annuncio è
vivo e nessuno ha risposto».

**Il punto interessante non è il difetto, è dove stava.** La directory
pubblica filtra già per `startsAt >= adesso`. Le proprie candidature erano già
divise in attive / concluse / archivio. `now` veniva calcolato **in questa
stessa funzione** e usato ovunque tranne che nell'unico elenco in cui
mancava — cioè la nozione di «passato» esisteva tre volte nel file e non era
applicata al quarto caso.

**Decisione.** Due sezioni, e il significato che cambia con lo stato: «0
candidature» su un annuncio aperto è un invito a rilanciarlo, su uno concluso
diventa «nessuna candidatura ricevuta»; «Gestisci» diventa «Vedi» quando non
resta niente da decidere. Il conteggio in cima passa da «Pubblicati» — che
sale e non scende mai — ad «Aperti ora», che è l'unico su cui si può agire.
Il bordo di chi aspetta una risposta resta anche sui conclusi: qualcuno che si
è candidato e non ha mai ricevuto risposta è un debito che la data non
cancella.

**La regola, e vale oltre questo caso.** Quando una scheda afferma qualcosa
per iscritto — «vivo», «in attesa», «0 candidature» — quell'affermazione è una
promessa sui dati, e va verificata dal codice che la stampa. Qui il commento
descriveva correttamente l'intenzione e il codice la contraddiceva per una
riga di annunci su cui nessuno aveva provato.

---

## ADR-034 · Un modulo che rifiuta e tace

**Contesto.** `ProfileForm` raccoglieva gli errori di `zod` in un dizionario
indicizzato per campo e ne mostrava **quattro su undici**. Per gli altri il
`submit` si interrompeva senza scrivere niente in pagina: chi lo usa ripreme
«Salva», non succede nulla, e conclude che il sito è rotto.

Nella forma attuale dello schema quasi nessuna di quelle regole è
raggiungibile — `maxLength` nel DOM taglia già headline e biografia. Ma il
difetto non è nei sette campi: è che *mostrare l'errore era una cosa da
ricordarsi*. La prima regola nuova in `profileSchema`, o il primo `details`
inatteso dall'API, diventa un rifiuto silenzioso.

**Decisione.** Un componente `Errore` solo, presente su ogni campo, e in fondo
al modulo la stampa di ogni chiave rimasta senza posto. Il caso «errore che
nessuno mostra» smette di essere possibile invece di essere corretto un campo
alla volta.

**Insieme:** il contatore della biografia. La scheda della reputazione, dieci
centimetri più in alto, chiede quattrocento caratteri; il campo non ne mostrava
nessuno, mentre l'headline — una soglia sola, e meno peso — il contatore ce
l'aveva. Le soglie non sono ricopiate: `SCAGLIONI_BIO` è esportato da
`reputazione.ts` e usato sia per assegnare i punti sia per dire quanto manca.
Due copie della stessa regola divergono alla prima modifica, ed è il modo in
cui su questo progetto è nata metà dei difetti.

**Cosa il modulo non dice**, deliberatamente: la soglia di indicizzazione.
Quella regola è «almeno 120 caratteri **oppure** un lavoro nel portfolio», e
il modulo non sa quanti lavori ci siano. Dirla a metà significherebbe scrivere
«non compari su Google» a qualcuno che invece ci compare. La dice la
dashboard, che ha il dato.

---

## ADR-035 · Un annuncio con data passata è un successo che non è successo

**Contesto.** `eventSchema` non chiedeva che la data fosse futura. Il modulo
accettava, l'API rispondeva 201, la pagina dell'ingaggio si apriva — e
l'annuncio **non compariva in nessun elenco**, perché `/eventi`, le directory
di città e la mappa filtrano tutte per `startsAt >= adesso`.

Chi lo pubblica non ha modo di accorgersene: ha visto la conferma, ha visto la
sua pagina, e aspetta candidature che non arriveranno. In produzione c'era già
un ingaggio datato 3 marzo 2024, pubblicato e invisibile.

**È la categoria peggiore.** Non un errore che si vede — un errore che si
vede lo si segnala, e nel frattempo si riprova. Qui il sistema dice di sì e
non fa niente, e l'unico modo di scoprirlo è aspettare abbastanza a lungo da
insospettirsi. Su una piattaforma a due lati significa perdere l'organizzatore
al primo tentativo, cioè il lato più difficile da procurarsi.

**Decisione.** `eventNuovoSchema` — `eventSchema` più il vincolo sulla data —
usato dalla creazione, sia nel modulo sia nella POST. La modifica continua a
usare `eventSchema`: correggere un refuso nel titolo di una serata dell'anno
scorso deve restare possibile, e una validazione che impedisce di sistemare i
propri errori è peggio del problema che risolve. Il campo ha anche `min`, che
è solo un aiuto del browser — la difesa vale anche per chi la richiesta la
manda senza passare dal modulo.

**La soglia è esattamente «dopo adesso»**, cioè alla lettera la condizione con
cui la directory decide se mostrarlo. Una più generosa — «non prima di ieri» —
rimetterebbe in circolo annunci pubblicabili e invisibili: il difetto di
partenza in versione più piccola e più difficile da trovare. La promessa che
questa regola mantiene è una sola: **se lo pubblichi, si vede.**

**La regola generale.** Ogni volta che una vista filtra, il modulo che
scrive deve conoscere quel filtro. Un dato che si può salvare ma che nessuna
pagina mostrerà è un modo silenzioso di perdere il lavoro di qualcuno.

---

## ADR-036 · Il plurale non può essere facoltativo

**Contesto.** «1 ARTISTI» sulla pagina delle città. Corretto. Due giorni
dopo, «1 messaggi» in cima a una conversazione. In altri sei punti del sito
la stessa frase era scritta giusta, con un ternario a mano.

**Perché non è un dettaglio.** Chi legge «1 messaggi» non deduce che c'è un
difetto: deduce che dietro non c'è nessuno che guarda. Su un dominio nuovo,
che deve convincere venti artisti a fidarsi, è il genere di segnale che costa
più di quanto valga la riga di codice che lo produce.

**Decisione.** `conta()` e `concorda()` in `src/lib/testo.ts`, e i sei punti
già corretti convertiti insieme a quello sbagliato.

**L'obiezione, e la risposta.** Convertire sei chiamate che funzionavano è
churn: il ternario inline è leggibile e non era rotto. Ma il difetto non
stava nei sei corretti né nei due sbagliati — stava nel fatto che **concordare
il plurale era una scelta**, ripetuta a mano ogni volta. Finché lo è, ogni
conteggio nuovo è un'altra occasione, e questa è arrivata due volte in
produzione in due giorni. È lo stesso schema di ADR-034 e di quasi tutti i
difetti di questo progetto: la regola esiste, tutti la conoscono, e niente la
applica.

**Poscritto, mezz'ora dopo.** Nel rilascio successivo — quello che conteneva
questo ADR — è arrivato in produzione **«1 LAVORI PUBBLICATI»**, scritto da
me, sulla pagina pubblica di un artista. Le funzioni esistevano già; erano
etichette fisse dentro un elenco, e scrivere una stringa in un array non
incontra nessuna funzione.

È la dimostrazione più netta possibile della tesi qui sopra, e vale più
dell'argomento: *avere lo strumento non basta, se usarlo resta facoltativo.*
La stessa forma era in tutta la dashboard — «1 CONVERSAZIONI», «1 LAVORI
CARICATI», «1 URGENTI».

La correzione è quindi nel **tipo**, non nelle stringhe: l'etichetta di un
numero in `SezioneHeader` è ora `string | [singolare, plurale]`. Chi aggiunge
un conteggio deve decidere se quella parola ha un plurale — «Livello» e «In
attesa» non ce l'hanno, e la stringa singola resta legittima. Scegliere è
obbligatorio; dimenticarsene non è più possibile.

---

## ADR-037 · Una casella di spunta è un controllo, non un residuo di sistema

**Contesto.** Le tre caselle del sito — «profilo visibile», «ingaggio
retribuito», «oscura il contenuto» — erano quelle native del browser: alte
tredici pixel, col grigio di sistema, in mezzo a campi che hanno tutti bordo,
angoli e anello di fuoco propri. Governano però le cose che meno si vogliono
sbagliare con un dito: sparire dalla directory, dichiarare un compenso,
rimuovere il contenuto di qualcuno.

**Decisione.** Una classe `.checkbox` con `accent-color` e venti pixel di
lato, e `min-h-11` sull'etichetta che la contiene.

**Perché `accent-color` e non una casella ridisegnata.** La ricetta diffusa è
`appearance: none` più uno pseudo-elemento per la spunta. Costa il segno di
spunta, lo stato indeterminato, il tratteggio del fuoco e — la parte che
nessuno riscrive bene — il comportamento coi lettori di schermo e con le
impostazioni di contrasto elevato del sistema operativo. Qui erano sbagliate
due cose, dimensione e colore, e si cambiano quelle due.

**L'area grande la dà l'etichetta, non la casella.** Portare la casella a
44px la renderebbe sproporzionata rispetto al testo accanto; portare a 44px
l'etichetta che la contiene dà lo stesso bersaglio al dito senza toccare
l'aspetto.

**Insieme, da telefono:** il pulsante che apre il menu dell'area personale
mostra ora quante cose aspettano una risposta. I contatori accanto alle voci
stavano dentro un pannello chiuso, quindi si vedevano solo dopo essere andati
a cercarli — cioè mai, che è tutto il contrario del motivo per cui esistono.

---

## ADR-038 · Un token è una fotografia, non uno specchio

**Contesto.** Cambiato lo slug del profilo da `kkkk` a `daniele`, la nuova
pagina rispondeva e la vecchia dava 404 — corretto. Ma il collegamento
«Profilo pubblico» della dashboard continuava a puntare a `/artisti/kkkk`,
perché lo leggeva da `session.user.slug`, cioè dal JWT: scritto all'accesso e
immutato fino alla scadenza.

**Il danno visibile era il meno grave.** Lo stesso valore alimentava i
`revalidatePath` di tre route API. Caricando un lavoro nel portfolio si
rigenerava la cache di `/artisti/kkkk` — una pagina che non esiste più —
mentre `/artisti/daniele` continuava a servire la versione vecchia. Nessun
errore, nessun log: l'artista carica il proprio lavoro, non lo vede comparire
sul proprio profilo, e non ha modo di capire perché. È la stessa categoria di
ADR-035: il sistema dice di sì e non fa niente.

**Decisione.** Lo slug esce dal tipo `Session` e si legge da `slugDi(userId)`.

**Perché toglierlo dal tipo e non limitarsi a correggere i cinque punti.**
Perché «c'è ma non usarlo» è la regola scritta da qualche parte che niente
applica — lo schema che su questo progetto ha prodotto quasi tutti i difetti
(ADR-034, 036). Tolto dal tipo, il compilatore rifiuta chi ci riprova, e la
verifica non dipende più da chi rilegge.

**Cosa resta nel token, e perché.** `id`, che per definizione non cambia mai.
`role`, come scorciatoia — ma dove una revoca deve avere effetto immediato
viene già riletto dal database: il layout della dashboard lo faceva da prima,
con un commento che diceva esattamente questo. La regola c'era, applicata a un
campo su due.

**La regola generale.** In un token può stare solo ciò che non cambia, o ciò
il cui ritardo è accettabile e dichiarato. Tutto il resto è una copia che
diverge — e diverge in silenzio, perché nessuna copia sa di essere vecchia.

---

## ADR-039 · Un punteggio non si stampa accanto al nome di una persona

**Contesto.** La pagina pubblica di un artista si apriva con tre numeri
grandi, e il primo era **«53/110 · Reputazione»**. Su un profilo curato —
biografia, discipline, portfolio, identità verificata.

**Il problema è il denominatore.** Trenta dei centodieci punti richiedono
ingaggi confermati od organizzati, che su una piattaforma appena nata non
esistono per nessuno. Un artista con tutto compilato arriva a ottanta, e senza
la verifica dell'identità — che assegniamo noi, a mano — a sessantacinque.
Vuol dire che per mesi **ogni profilo del sito mostrerà un numero sotto la
metà**. «53/110» non significa «questa persona vale poco», significa «il sito
è nuovo»; ma stampato accanto a un nome si legge nel primo modo.

**E c'è il costo pratico.** Il passo successivo del progetto è chiedere a
venti artisti veri di accettare una pagina con il proprio nome, le proprie
foto e il proprio lavoro. Un voto sotto la metà accanto al nome è un ottimo
motivo per dire di no — e ci sta pochissimo a diventare la ragione per cui
questo progetto non parte.

**Decisione.** Il punteggio sparisce dalla pagina pubblica. Continua a
decidere l'ordine della directory, ed è spiegato voce per voce a chi lo
possiede, nella propria area personale. Al suo posto un fatto e non un
giudizio: quanti lavori ci sono.

**Non è nascondere il criterio.** Era già stato tolto dalle schede in elenco
per lo stesso motivo; qui la scelta valeva di più e non era stata portata
fino in fondo. Chi ha diritto di sapere come si costruisce quel numero è la
persona che ne è misurata, e lo vede per intero. Un visitatore non ha nulla
da farci: sulla pagina di un singolo non c'è niente con cui confrontarlo.

**La regola.** Una metrica interna diventa un giudizio pubblico nel momento in
cui la si stampa accanto a un nome proprio. Prima di mostrarne una, va
chiesto: chi la legge, cosa ci fa — e la persona misurata l'ha accettata?

---

## ADR-040 · Il caso vuoto, la terza volta

Tre difetti sulla pagina pubblica del profilo e su quella dell'ingaggio,
tutti figli della stessa causa già registrata due volte.

**La colonna principale poteva essere completamente vuota.** Biografia,
portfolio e ingaggi pubblicati erano tre sezioni condizionate, e un profilo
che non ha nessuna delle tre rendeva una voragine larga metà schermo con la
barra laterale sospesa accanto. Non è un caso raro: è lo stato di **ogni
artista appena importato** e di chiunque si iscriva, cioè la prima impressione
che il sito dà di sé. Ora quel caso ha un testo suo, che dice cosa sappiamo e
invita a scrivere — perché la pagina non è inutile, è solo nuova, e un buco
chi legge lo interpreta come un guasto.

**Dietro le anteprime del portfolio non c'era niente.** Il riquadro 4:3
conteneva un'immagine solo per i lavori di tipo `image`: per un brano o un
video restava vuoto, cioè metà del portfolio di un musicista. Il segnaposto —
tinta e icona per tipo — sta ora **dietro**, sempre presente, e l'immagine gli
si sovrappone. Una cosa sola copre due casi: il tipo senza anteprima e
l'immagine che non carica, che in produzione capitava già e mostrava il
rettangolo rotto del browser. Nessun `onError`: richiederebbe un componente
client sulla pagina su cui poggia tutta la strategia di ricerca, e il caso
degrada comunque in qualcosa di voluto.

**La mappa era bianca**, sul tema scuro, su ogni pagina di ingaggio e di
città. Il filtro di inversione esisteva da ieri — applicato alla mappa
interattiva di `/mappa` e non all'`iframe` che usano le altre due, perché sono
componenti diversi. Ora i due selettori condividono una dichiarazione sola, e
non possono più divergere.

**Anche l'avatar** era allineato al fondo dei pulsanti: su un profilo pieno il
blocco di testo è alto il doppio, quindi la faccia della persona finiva
relegata centosessanta pixel sotto il proprio nome — e peggiorava man mano che
il profilo si riempiva, cioè al contrario di quello che serve.

**Cosa aggiunge alla regola di ieri.** Non basta disegnare il caso vuoto: va
disegnato **per ogni tipo di contenuto**, e la difesa va messa dove non si
possa applicare a metà. Il segnaposto dietro l'immagine e la dichiarazione CSS
condivisa fra le due mappe sono la stessa idea — rendere l'assenza un caso
gestito per costruzione, invece che un ramo da ricordarsi.

---

## ADR-041 · Separare un database significa spostare anche chi lo guarda

**Contesto.** In una sola giornata la stessa cosa è successa tre volte.

1. I test scrivevano in produzione. Rimedio: `E2E_DATABASE_URL`, un branch
   dedicato, e una guardia che non li fa partire senza (ADR-029).
2. I dati dimostrativi non devono toccare la produzione. Rimedio:
   `DEMO_DATABASE_URL` e la stessa forma di guardia.

Entrambe le difese funzionano. Entrambe hanno lasciato indietro qualcosa:

- **`npm run dev` guardava `DATABASE_URL`**, mentre `demo:popola` riempiva
  l'altro database. Si popolava un posto e se ne guardava un altro: la pagina
  degli artisti ne mostrava sette e sembrava che l'importazione non fosse
  riuscita, mentre era riuscita benissimo altrove.
- **`pulisci:e2e` cancellava da `DATABASE_URL`**, mentre gli account di prova
  nascevano sul branch di test. Diceva «nessun account da rimuovere» mentre
  erano **trentotto**, nove dei quali fermi lì dal giorno prima, tutti
  pubblici, con slug `prova-percorso`, `prova-percorso-2`…

**Il secondo caso è il più istruttivo**, perché la difesa ha *nascosto* il
problema che quello strumento esisteva per risolvere. Prima della
separazione i residui erano in produzione e si vedevano; dopo, erano in un
posto che nessuno controllava più — e lo strumento di controllo diceva che
era tutto a posto. Se quel branch fosse stato la produzione sarebbero state
trentotto pagine pubbliche di persone inesistenti su un dominio indicizzato.

**Decisione.** `npm run dev:demo` e `pulisci:e2e` che legge
`E2E_DATABASE_URL`. Entrambi dichiarano in testa su quale database stanno
lavorando: non ci si accorge di guardare il posto sbagliato se nessuno dice
qual è il posto.

**La regola.** Quando si separa un database, vanno spostati con lui **tutti**
gli strumenti che lo toccano — quelli che scrivono, quelli che leggono e
quelli che puliscono. Una separazione che ne lascia indietro uno non è più
sicura: è solo più difficile da capire, perché lo strumento rimasto indietro
continua a rispondere, e risponde di un posto che non è più quello giusto.

**Corollario operativo:** ogni comando che parla con un database dice a quale
si è collegato, prima di fare qualunque cosa. È una riga di output, e
sostituisce un'intera categoria di malintesi.

---

## ADR-042 · La gamification premia con visibilità, non con monete

**Contesto.** La proposta era ampia: quest riscuotibili con animazione, una
roulette giornaliera che distribuisce monete, un negozio di vestiti e
accessori per un avatar, minigiochi per trattenere le persone.

**Decisione.** Si tiene tutta la **meccanica** — riscatto, animazione,
rotazione, ritorno quotidiano, cosmetici da collezionare — e si cambia la
**valuta**: si premia con visibilità e credibilità, non con monete.

**Perché, in quattro punti che non sono opinioni.**

**1. Il lato che paga se ne va.** Questa è una piattaforma a due lati, e
quello difficile da procurarsi è l'organizzatore: il gestore del locale, chi
produce la serata. Se apre il sito e trova una ruota della fortuna e un
negozio di cappelli conclude «gioco», non «qui trovo un professionista per
sabato». Si perde il lato che meno ci si può permettere di perdere — e senza
di lui l'altro non ha motivo di restare.

**2. Contraddice due decisioni già prese.** Il livello era stato tolto dal
profilo pubblico perché *misura quanto una persona usa il sito, che non è un
dato di cui un organizzatore debba tener conto per decidere se scriverle*. La
reputazione è stata tolta dalle pagine pubbliche (ADR-039) perché un voto
accanto a un nome si legge come un giudizio sulla persona. Un avatar con
vestiti comprati è lo stesso argomento portato più avanti nella direzione
opposta: rende ancora più visibile la misura del tempo passato qui dentro,
proprio mentre si è deciso che quella misura non riguarda nessun altro.

**3. Le monete sono pagamenti.** Valuta virtuale acquistabile, e una roulette
che distribuisce premi è tecnicamente una loot box: in più giurisdizioni
europee è materia sorvegliata, tocca la tutela dei minori, l'IVA e i diritti
di recesso, e imporrebbe di riscrivere i termini di servizio. È una superficie
giuridica più grande di tutto il resto del sito messo insieme, su un progetto
i cui testi legali aspettano ancora una revisione.

**4. Non risolve il problema che vuole risolvere.** I minigiochi trattengono
chi è venuto per il minigioco. Qui il problema di ritorno è un altro: un
artista non ha motivo di riaprire il sito finché nessuno lo contatta. Si
risolve con notifiche che valgono qualcosa e con premi che migliorano la sua
posizione, non con una ruota.

**Cosa si fa invece.** Quest riscuotibili con serbatoio che si ricarica; una
vetrina in home a rotazione, che si conquista con la costanza e che è scarsa —
quindi desiderabile; distintivi sul profilo pubblico legati a fatti veri
(identità verificata, dieci ingaggi confermati, primo anno); serie giornaliere
sui comportamenti che fanno funzionare il mercato, come rispondere a tutte le
candidature.

**La differenza in una riga:** ogni premio deve rendere l'artista **più
facile da ingaggiare**. Un cappello non lo fa; comparire in home sì.

---

## ADR-043 · Completare e riscuotere sono due momenti diversi

**Contesto.** L'XP veniva assegnato nell'istante in cui la condizione di una
quest era soddisfatta. Funzionava, e non se ne accorgeva nessuno: il numero
cambiava mentre si stava facendo altro — si carica un lavoro nel portfolio e
l'XP arriva su una pagina che non si sta guardando. La pagina Quest era
diventata un archivio di cose già successe.

**Decisione.** La quest si completa da sé, la ricompensa si riscuote con un
gesto. L'XP vola dal pulsante alla barra del livello, la barra sale, la quest
si chiude e sparisce lasciando il posto alla successiva.

**Perché l'animazione non è decorazione.** Rende visibile una relazione di
causa: *questo* sforzo è diventato *quel* progresso. È l'unica informazione
che il numero da solo non dà, ed è esattamente quella che si perdeva. Dura
seicento millisecondi: oltre il secondo un'animazione smette di essere una
risposta e diventa un'attesa, e la si comincia a saltare.

**Perché le riscosse spariscono.** Restavano nell'elenco, sbiadite, «per
mostrare la strada fatta». Con otto voci significa che dopo un mese metà
dell'elenco è fatto di cose su cui non c'è più niente da fare. La strada fatta
la dicono già il livello e l'XP; un elenco di obiettivi serve a dire cosa
manca. Ed è il riscatto a renderlo possibile: finché la ricompensa arrivava da
sola, una quest completata non aveva motivo di uscire di scena.

**Le tre difese sul doppio incasso.** La ricompensa la decide il server
leggendo la quest dal database — il client dice quale, non quanto. Si riscuote
solo ciò che risulta completato. E si riscuote una volta sola, perché
`riscossaIl` viene scritto nella stessa `updateMany` che lo pretende ancora
nullo: due richieste simultanee — due schede aperte, un doppio clic — ne
trovano una sola con qualcosa da aggiornare. È la condizione di gara che, su
qualunque cosa somigli a una moneta, arriva sempre.

**La migrazione è la parte che si dimentica.** Chi aveva già completato delle
quest quell'XP l'aveva già ricevuto: aggiungere la colonna e basta le avrebbe
lasciate riscuotibili, e al primo accesso ognuno avrebbe incassato una seconda
volta ricompense già avute. Non è un errore che si vede — i numeri salgono, e
sembra che funzioni. La migrazione marca come già riscosso tutto ciò che
risulta completato.

---

## ADR-044 · La vetrina è una fila, non un podio

**Contesto.** La home mostrava «i sei artisti con la reputazione più alta».
Sembra meritocratico ed è un incentivo morto: i primi sei sono sempre gli
stessi, chi è settimo non ci arriverà mai, e chi è primo non ha motivo di fare
altro. Una classifica premia una volta e poi smette di chiedere qualcosa.

**Decisione.** Si supera una soglia — profilo pubblico, indirizzo confermato —
e da quel momento si è nella rotazione. La vetrina scorre di un posto al
giorno: ognuno entra, resta sei giorni, esce, e riavrà il proprio turno.

**Perché è questa la forma del premio quotidiano.** È la risposta alla
richiesta di «una roulette giornaliera con dei premi» (ADR-042). Stessa
funzione — un motivo per tornare, qualcosa che si vince — e premio diverso:
non una moneta da spendere in un negozio, ma **il posto più visto del sito**.
Per un artista è la cosa che vuole davvero, e per la directory è un
miglioramento: chi arriva in home trova qualcuno di diverso ogni giorno invece
della stessa fila di sempre.

**La proprietà che conta è la raggiungibilità.** «Completa il profilo e prima
o poi sei in home» è una cosa che una persona può decidere di fare. «Diventa
il primo di trecento» no. Un incentivo che quasi nessuno può soddisfare non è
un incentivo: è una decorazione per chi era già davanti.

**La scarsità si regola da sé.** Più artisti superano la soglia, più raro è il
proprio turno. È il contrario di una ricompensa che si svaluta man mano che la
si distribuisce — e significa che il premio diventa più prezioso proprio
mentre il sito diventa più utile.

**Nessun processo programmato, nessuna scrittura.** La scelta è una funzione
pura del giorno: niente lavoro notturno da tenere in piedi, niente colonna da
aggiornare, niente stato che può divergere. Un premio quotidiano affidato a un
processo programmato è un premio che il giorno in cui quel processo non parte
non c'è — e nessuno se ne accorge finché non lo chiede qualcuno.

**L'ordine dei candidati è per data d'iscrizione, mai per reputazione.** Deve
essere stabile: un ordine che cambia da solo farebbe saltare il turno a
qualcuno ogni volta che un numero si muove, senza che nessuno l'abbia deciso.

**E si dice a chi aspetta quando tocca.** Un premio che non si sa di poter
vincere non incentiva niente, e «sei in rotazione» non si può verificare. «Fra
sei giorni» è un impegno: se il settimo giorno non è successo, chi legge se ne
accorge — ed è giusto che se ne accorga.

---

## ADR-045 · La reputazione è la formula di un ruolo, e ne servono due

**Contesto.** `dettaglioReputazione()` restituiva otto voci uguali per tutti.
Tre di quelle — discipline dichiarate, portfolio, ingaggi confermati — un
organizzatore non può ottenerle: non dichiara discipline, non ha un portfolio,
non viene scelto da nessuno. Sono quarantacinque punti su centodieci fuori
portata **per costruzione**.

Il numero, misurato: un locale modello — profilo completo, identità
verificata, quattro ingaggi conclusi, tutti retribuiti, risposta a ogni
candidatura ricevuta — otteneva **55/100**. La scheda che spiega il punteggio
gli suggeriva «carica fino a cinque lavori: è quello che convince davvero».

Non è un difetto estetico. È un punteggio presentato come misura di
affidabilità che condanna metà degli iscritti a un tetto del 55%, e che
consiglia loro rimedi inapplicabili. E lo subisce il lato che paga.

**Decisione.** Due insiemi di voci, uno per ruolo, entrambi con massimo **100**.

Il massimo uguale non è simmetria estetica: rende il numero confrontabile fra
i due lati — «ottanta» significa la stessa cosa per un artista e per un locale
— e toglie di mezzo la percentuale calcolata su denominatori diversi, che è il
modo più economico di mentire con una barra di progresso.

La domanda che sceglie le voci resta una, ribaltata:

- artista: *cosa dice a un organizzatore che questa persona è una scelta sicura?*
- organizzatore: *cosa dice a un artista che vale la pena candidarsi qui?*

**Perché «rispondi a chi si candida» pesa un quarto.** È la voce più pesante
delle due formule, e sfora deliberatamente il limite di un quinto che vale per
l'artista. La ragione è che l'asimmetria è reale: per un artista non esiste una
cosa sola che dica «è affidabile», per un organizzatore sì.

Candidarsi e non ricevere risposta è il danno peggiore che questo prodotto
possa fare, e lo fa **in silenzio** — non succede niente, nessuno se ne
accorge, e la seconda volta quell'artista non si candida più. È anche l'unico
comportamento che, diventando la norma, svuota il sito dal lato che lo riempie
di contenuti.

Un no vale quanto un sì: si misura **se** rispondi, non cosa rispondi.
Premiare le accettazioni spingerebbe ad accettare per punteggio, e l'artista
scelto così se ne accorge la sera del concerto.

**Il misurabile e lo zero.** Con meno di tre candidature ricevute la voce non
vale zero: **non si conta**, né al numeratore né al denominatore. Zero
significa «non l'hai fatto»; qui il fatto non è mai avvenuto. Dare zero a un
iscritto di ieri lo dichiarerebbe inaffidabile per qualcosa che non è
successo, e il rimedio suggerito — «rispondi» — sarebbe inapplicabile. Un
organizzatore nuovo col profilo completo sta quindi a 65/65, non a 65/100.

**Conseguenze.**

- I punteggi già in tabella sono calcolati su un massimo che non esiste più.
  `npm run reputazione:ricalcola` va rilanciato dopo la migrazione, e il suo
  preambolo ora lo dice.
- La lettura dei fatti era duplicata in tre punti — due in
  `reputazione-server.ts` e uno nello script. Aggiungendo le voci
  dell'organizzatore sarebbero diventate tre copie *divergenti*: lo script
  avrebbe scritto in tabella un numero diverso da quello mostrato in pagina,
  entrambi plausibili, nessuno a confrontarli. Ora c'è una `fattiDi()` sola.
- `PATCH /api/participations/[id]` ricalcolava la reputazione dell'artista e
  non quella dell'organizzatore. Con la nuova formula quello è **l'unico punto
  del sistema in cui la voce che pesa di più cambia valore**: senza il
  ricalcolo, la regola sarebbe esistita nella formula e niente l'avrebbe
  applicata. È la forma di difetto numero due di COLLOQUIO.md, e stava per
  ripetersi mezz'ora dopo aver scritto la formula.

---

## ADR-046 · Il ruolo è un'intenzione dichiarata, non un permesso

**Contesto.** `User.role` esisteva dalla prima migrazione e non faceva quasi
niente. Chi si iscriveva per **cercare** riceveva il prodotto di chi vuole
**essere trovato**: Portfolio al terzo posto del menu, la vetrina che gli
diceva ogni giorno «non sei ancora in rotazione» a proposito di una rotazione
che filtra per ruolo e quindi non lo includerà mai, e in elenco «Portfolio
solido — arriva a 5 lavori pubblicati», ferma a 0/5 per sempre.

**Decisione.** Il ruolo decide **cosa sta in primo piano e cosa il sistema ti
promette**, non cosa puoi fare. Tutte le pagine restano raggiungibili.

**Perché non un lucchetto.** Si rompe al primo caso vero: un locale con una
band residente, un artista che organizza la propria jam. Nel prodotto oggi
chiunque può pubblicare un ingaggio, ed è giusto — `first_event` resta infatti
un obiettivo per tutti. Vietare avrebbe richiesto di decidere in anticipo casi
che non conosciamo, e ogni eccezione sarebbe diventata una porta chiusa in
faccia a qualcuno.

**La regola che ne discende, e che vale per ogni aggiunta futura:** *non
promettere a un ruolo un obiettivo che il suo ruolo non raggiunge.* Un elenco
pieno di cose impossibili non motiva — insegna a ignorare l'elenco, comprese le
voci che valevano.

**Cosa cambia in concreto.** Menu diverso, con «Cerca artisti» promosso nel
gruppo principale dell'organizzatore perché sfogliare la directory è metà del
suo mestiere e non un'escursione fuori dall'area personale; le candidature in
attesa sopra il feed; «Da dove si comincia» che sparisce al primo annuncio
invece di ripetersi al decimo; `Quest.ruoli` come CSV, vuoto uguale «a tutti»
— il silenzio è inclusivo, così una riga nuova non sparisce senza che nessuno
se ne accorga.

---

## ADR-047 · Le monete comprano ciò che si vede, mai ciò che decide

**Contesto.** ADR-042 rifiutava le monete. Uno dei suoi quattro argomenti — il
terzo, quello giuridico su loot box, IVA e diritto di recesso — poggiava su
una premessa sbagliata: che le monete si comprassero con denaro reale. Non è
così: sono una valuta interna, si guadagnano solo usando il sito.

Con la premessa cade l'argomento. Questo ADR non nasconde ADR-042: lo corregge
dove sbagliava e tiene il resto, che regge ancora.

**Cosa resta di ADR-042.** Il punto 2. Il livello è stato tolto dal profilo
pubblico perché misura quanto una persona usa il sito, e quello non è un dato
su cui un organizzatore debba decidere se scriverle. Una moneta guadagnata
giocando è la stessa misura con un altro nome: se diventa visibile o
influente, si è rimesso in pagina esattamente ciò che si era deciso di
toglierne.

**Decisione.** La moneta esiste. Il confine è uno solo:

> Le monete comprano **ciò che si vede**. Non comprano mai **ciò che decide**.

**Non comprabile, in nessuna forma e a nessun prezzo:**

- la posizione in `/artisti` — è ciò che ADR-039 e la riscrittura della
  reputazione esistono per proteggere;
- i posti in vetrina in home (ADR-044): sono una fila, e una fila comprabile
  non è più una fila;
- i distintivi (ADR sui fatti verificabili) e la verifica d'identità: sono
  affermazioni su fatti, e un fatto comprato è una bugia con una ricevuta;
- qualunque cosa entri nella reputazione.

**Comprabile:** cornici attorno alla foto vera, temi e colore d'accento del
profilo, elementi dell'avatar, decorazioni del feed. Cose che dicono «sono qui
da un po' e mi ci diverto», che è vero, e che nessun organizzatore scambierà
mai per una misura di bravura.

**Perché il confine sta esattamente lì.** Se le monete comprassero visibilità,
la directory tornerebbe ordinata per *quanto hai usato il sito* — il difetto
rimosso con la riscrittura della reputazione — ma in una versione peggiore,
perché sarebbe **venduta come una funzione** invece che subìta come un errore.
E il danno vero non lo prende l'artista scavalcato: lo prende l'organizzatore
che si fida di quell'ordine per trovare un chitarrista a Bologna sabato. Nel
momento in cui l'ordine è comprabile, la directory smette di servirgli — e lui
è il lato che tiene in piedi tutto il resto.

**Come si guadagnano.** Non con la presenza, con il mestiere.

Una ruota giornaliera che gira per il solo fatto di aver aperto il sito premia
chi ha tempo. La stessa ruota, che si sblocca **avendo fatto una cosa** — una
candidatura a cui hai risposto, un lavoro caricato, un annuncio pubblicato —
premia chi fa funzionare il mercato, e trasforma il ritorno quotidiano da
tempo passato in lavoro fatto. La meccanica è identica, il comportamento che
produce è opposto.

**Come si difende.** Con una prova, non con questa pagina. L'elenco di ciò che
è acquistabile vive in un posto solo, e un test verifica che nessuna voce
tocchi reputazione, vetrina, ordinamento o distintivi. Una regola scritta in
un ADR e non applicata da niente è la forma di difetto numero due di
COLLOQUIO.md, ed è quella che su questo progetto si è ripetuta più spesso.

---

## ADR-048 · La mappa è la ricerca, ed è chiusa dentro l'Italia

**Contesto.** `/eventi` aveva i filtri — tipo, compenso, città — e nessuna
geografia. `/mappa` aveva la geografia e nessun filtro: solo un raggio, per
giunta disponibile unicamente dopo aver concesso la posizione. Per rispondere
a «casting retribuiti vicino a Bologna» bisognava fare metà del lavoro di là,
tenere a mente il risultato, e rifare l'altra metà di qua.

Sono due viste sulla stessa domanda. Tenerle separate non era una scelta: era
il residuo dell'ordine in cui sono state scritte.

**Decisione.** I filtri vivono accanto alla mappa. `/eventi` resta, e resta la
versione indicizzabile — è quella che leggono i motori di ricerca, ed è da lì
che arriva il traffico. La mappa è lo strumento di lavoro; l'elenco è la porta
d'ingresso.

**I confini.** La mappa non esce dall'Italia: `maxBounds` con viscosità piena,
e uno zoom minimo che tiene la penisola dentro anche su un telefono. Il sito è
italiano in ogni riga del suo contenuto; una mappa trascinabile fino in
Groenlandia offre un solo esito possibile — uno schermo vuoto — e chi ci
finisce non sa più tornare indietro se non ricaricando. Non è libertà, è un
vicolo cieco raggiungibile con due dita.

Il confine però va difeso da entrambi i lati: un annuncio geocodificato male —
lat e lng scambiate, l'errore più comune, che manda Roma nel Corno d'Africa —
diventerebbe un pin **fuori dai limiti dentro una mappa che non permette di
uscirne**. Irraggiungibile, e il suo autore vedrebbe «pubblicato» senza che
nessuno lo trovi mai. Il filtro sta quindi anche sul server, e la stessa
funzione risponde a entrambe le domande.

**Il raggruppamento, scritto a mano.** Con l'Italia intera sullo schermo, sei
annunci a Milano sono sei pin nello stesso pixel: se ne vede uno e gli altri
cinque non esistono per chi guarda. La mappa non era illeggibile — era
**silenziosamente incompleta**, che è peggio, perché nessuno va a cercare
quello che non sa di non vedere.

`leaflet.markercluster` fa questo e molto altro, ma è una dipendenza di peso,
non tipizzata nativamente, con un adattatore React che segue Leaflet con
qualche mese di ritardo — su un progetto che ha già dovuto contenere il rischio
di una beta (ADR sul contenimento di next-auth). Quello che serve qui sono
quaranta righe di griglia in coordinate schermo, che si leggono, si provano e
si spiegano. Il criterio non è «meno dipendenze è meglio»: è che il costo di
capire la libreria superava il costo di scrivere la parte che uso.

Vive in `src/lib/mappa.ts`, puro e senza Leaflet, perché è l'unica logica non
banale della pagina ed è anche quella che sbagliata **non dà nessun errore**.
Le prove fissano le tre proprietà che contano: non perde né duplica punti a
nessuno zoom, non produce mai più simboli allontanandosi, e non dipende
dall'ordine dei dati in ingresso.

**Il resto della leggibilità.** Il pin prende il colore della categoria e la
pillola del filtro lo ripete, così il colore si impara senza legenda; il colore
non è però mai l'unico segnale — popup ed elenco dicono la categoria per
esteso. Il simbolo di un gruppo cresce con la **radice** del numero, perché è
l'area che l'occhio confronta, non il diametro. Al clic la mappa inquadra il
rettangolo del gruppo invece di alzare lo zoom di un passo fisso: sei annunci
su tutta la provincia e sei nello stesso isolato hanno bisogno di distanze
diverse, e indovinare al primo colpo è il minimo che una mappa debba fare.

---

## ADR-049 · Il gioco distribuisce i portfolio, e la classifica si azzera

**Contesto.** Serviva uno strato di intrattenimento **attivo** — qualcosa che
si fa, non solo qualcosa che viene misurato — con una classifica e ricompense
puramente estetiche. La domanda che un colloquio farà è una sola: *perché un
sito per ingaggiare musicisti ha un minigioco?*

**La risposta sbagliata** sarebbe un gioco qualunque — un quiz, un rompicapo —
attaccato di lato. Trattiene chi è venuto per il gioco, e ADR-042 aveva già
visto che quello non è il problema di ritorno di questo prodotto: un artista
non riapre il sito perché c'è un quiz, lo riapre perché qualcuno lo ha
contattato.

**Decisione: il gioco è un canale di distribuzione travestito da gioco.**

**«L'orecchio»** — una sfida quotidiana in cui si ascoltano brevi estratti dai
portfolio **reali** degli artisti iscritti e si indovina qualcosa su di essi:
genere, strumento, città. Punteggio, serie di risposte esatte, classifica.

Due cose accadono nello stesso momento, e la seconda è il motivo per cui
questa funzione esiste:

1. qualcuno si diverte per tre minuti;
2. **il lavoro di artisti veri viene ascoltato da persone vere.**

È la forma di visibilità più economica che questo sito possa produrre: nessun
budget pubblicitario, nessun posto in home da assegnare, e chi la riceve non
ha pagato niente. Il criterio di ADR-042 — *ogni premio deve rendere l'artista
più facile da ingaggiare* — qui è soddisfatto dal gioco stesso, non dal premio.

**Chi finisce nel gioco.** La stessa regola della vetrina (ADR-044): una fila,
non un podio. A rotazione, per anzianità d'iscrizione, con i posti scarsi.
Comprabile mai — è visibilità, e la visibilità non si compra (ADR-047). Se un
giorno si potesse pagare per essere ascoltati, il gioco diventerebbe un
cartellone pubblicitario e chi gioca smetterebbe di fidarsi di quello che
sente.

**La classifica si azzera.** Settimanale, e la stagione dura tre mesi.

Una classifica perpetua la vince chi si è iscritto per primo, e dopo un mese
nessun altro prova più: il montepremi è già assegnato e si vede. Azzerandola,
ogni lunedì tutti ripartono da zero — che è l'unica condizione in cui una
classifica motiva qualcuno che non sia già in cima.

Non ha niente a che vedere con la reputazione e non compare sul profilo
pubblico: vive in una pagina sua, e chi cerca un chitarrista non la incontra
mai. È la stessa ragione per cui il livello era stato tolto dal profilo.

**I premi.** Monete per i cosmetici, e per il primo posto settimanale un
oggetto **non acquistabile** — `emblema-orecchio` nel catalogo. È lì che vive
il «voler emergere»: non nella quantità di oggetti posseduti, che con
abbastanza tempo chiunque raggiunge, ma nei pochi che il tempo non compra.

**La ruota, ripresa da ADR-047.** Stessa regola: non gira perché sei entrato,
gira perché hai fatto qualcosa. Una partita conta, come contano una risposta a
una candidatura o un lavoro caricato. Il ritorno quotidiano diventa così lavoro
fatto invece che tempo passato, e la meccanica resta identica.

**Cosa esiste già.** Le fondamenta: `User.monete`, `Possesso`,
`MovimentoMonete` — un saldo senza registro non si può né correggere né
spiegare — e il catalogo in `src/lib/cosmetici.ts`, dove ogni slot **dichiara
cosa tocca** e il tipo `Effetto` è un'unione chiusa di cose innocue. Chi
volesse vendere visibilità dovrebbe aggiungere un valore a quel tipo, e
`tests/unit/cosmetici.test.ts` glielo impedirebbe con un messaggio che spiega
perché.

Il gioco e la classifica si costruiscono sopra. L'ordine è questo di
proposito: il confine prima di ciò che deve rispettarlo.

---

## ADR-050 · L'ornamento circonda ciò che conta, non lo sostituisce

**Contesto.** Le monete si guadagnano, il negozio esiste, e adesso qualcuno
comprerà qualcosa. Resta da decidere **dove si vede** — che è la domanda in cui
l'idea originale dell'avatar rischiava di far danno.

**Il problema con l'avatar.** Il profilo di un artista esiste per mostrare una
**foto vera**: è quello che un organizzatore guarda prima di scrivere. Un
personaggio disegnato che occupa quel posto lavora contro lo scopo della
pagina. Gli avatar funzionano dove le persone sono anonime — giochi, forum;
qui vogliono essere riconosciute e ingaggiate.

**Decisione.** Un ornamento circonda, non sostituisce.

- La **cornice** sta attorno alla foto. È un anello disegnato *fuori* dal
  contenitore, non un `border` sull'immagine: un bordo ritaglierebbe quattro
  pixel per lato, e una foto rimpicciolita è un prezzo che chi non ha comprato
  niente non paga.
- Il **titolo** sta sotto il nome, mai al posto suo, e in maiuscoletto —
  visibilmente diverso da un distintivo. I distintivi affermano un fatto
  verificato: confonderli con un ornamento comprato svaluterebbe i primi, e chi
  legge non saprebbe più quale delle due cose credere.

**Perché è un componente e non tre classi sparse.** Perché il confine deve
avere un posto solo. Sparso in cinque pagine, alla sesta qualcuno userebbe la
cornice come sfondo del nome in elenco — e da lì al «tema che evidenzia la tua
scheda fra le altre» il passo è breve. Quello sarebbe visibilità comprata,
cioè il difetto che ADR-047 esiste per impedire.

**Sul pagamento.** L'acquisto è un **confronta-e-scrivi** dentro una
transazione interattiva: `monete: { gte: prezzo }` sta nella condizione
dell'aggiornamento, non in un `if` prima. Leggere il saldo, decidere e poi
scrivere lascia in mezzo una finestra in cui un secondo clic passa lo stesso
controllo con lo stesso saldo — due oggetti al prezzo di uno. Mettendo la
condizione dentro la scrittura è il database ad arbitrare, ed è l'unico che
può. Il doppione lo ferma il vincolo di unicità, e siccome la creazione sta
nella stessa transazione, il suo fallimento riporta indietro anche l'addebito.

**Cosa succede a un oggetto ritirato dal catalogo.** Resta nella tabella di chi
l'aveva comprato e semplicemente non si disegna. Cancellare quelle righe
sarebbe togliere a qualcuno una cosa che ha pagato, e su una valuta —
qualunque valuta — è il genere di gesto che non si recupera più.

---

## ADR-051 · Non riscrivere il prodotto in WebGL

**Questo ADR documenta una cosa che non è stata fatta.** È il primo, ed è
volutamente qui: le decisioni che si vedono sono quelle prese, ma quelle che
tengono in piedi un progetto sono spesso quelle rifiutate.

**Contesto.** I siti che vincono i premi di settore — Awwwards e simili — sono
quasi tutti costruiti attorno a WebGL. La tentazione di rifare Vybes così è
concreta: colpirebbe, e su un progetto che serve anche a farsi assumere la
tentazione pesa il doppio.

**Decisione.** No, e la ragione non è tecnica.

**Sono due generi con criteri di successo opposti.** Quei siti sono
**brochure**: il portfolio di uno studio, il lancio di un prodotto, una
campagna. Una pagina, nessun ritorno, nessun dato da inserire. Si vincono sulla
**prima impressione**.

Vybes è uno **strumento d'uso ripetuto**: un gestore di locale che il martedì
mattina apre le candidature ricevute. Lì il successo è l'opposto — alla
cinquantesima apertura, due secondi di animazione non sono più un'impressione,
sono un ostacolo fra una persona e il suo lavoro.

**Contraddirebbe la tesi di tutto il progetto.** Cinquanta ADR discendono da una
frase sola: *ogni scelta serve a rendere un artista più facile da ingaggiare*.
È il criterio con cui è stato rifiutato l'avatar al posto della foto (ADR-050),
con cui le monete non comprano visibilità (ADR-047), con cui la classifica sta
in una pagina che chi cerca un chitarrista non incontra mai (ADR-049).

Una riscrittura in WebGL sarebbe la violazione più grande di quel principio in
tutto il progetto — e il danno peggiore non sarebbe l'effetto: sarebbe che ogni
altro ADR perderebbe credibilità, perché dimostrerebbe che il principio si
piega quando qualcosa è bello da vedere.

**I costi concreti, in ordine di gravità.** La SEO: l'intera strategia di
traffico sono pagine indicizzabili renderizzate sul server, e il contenuto
dentro una `canvas` per un motore di ricerca non esiste. L'accessibilità: una
canvas non ha DOM, quindi niente per gli screen reader e niente navigazione da
tastiera — una delle forze reali del progetto diventerebbe una debolezza. Le
prestazioni su telefono, dove sta il pubblico. E la fiducia: chi valuta se
spendere trecento euro vuole uno strumento, non una demo.

**Cosa si fa invece.** Un momento solo, sulla landing: ADR-052.

---

## ADR-052 · Un effetto solo, dove il mestiere della pagina è colpire

**Contesto.** Rifiutata la riscrittura (ADR-051), resta vero che la prima
impressione conta. La domanda diventa: **esiste un punto dove un effetto non
costa niente a nessuno?**

**Decisione.** Sì, uno: la landing. È l'unica pagina il cui mestiere *è*
colpire — la si guarda una volta, per pochi secondi, e dopo l'iscrizione non la
si rivede più, perché da lì in poi il logo porta alla dashboard.

Il resto del sito non ne riceve niente, e non è una limitazione da rispettare
in futuro: è **la decisione**.

**Perché *queste* onde e non un effetto qualunque.** È lo stesso fenomeno del
marchio: fronti emessi da una **sorgente che ruota**. Una sorgente ferma emette
cerchi concentrici; una che ruota li emette sfasati, e i fronti si avvolgono in
spirali — la ragione per cui un faro rotante disegna un vortice.

Il marchio è quel fenomeno in piccolo e fermo. La landing è lo stesso, grande e
in movimento, con tre sorgenti a velocità incommensurabili che interferiscono.
Non è una decorazione presa da una galleria: è **la stessa idea a scala
diversa**, ed è la sola giustificazione che rende difendibile un effetto su un
prodotto che per il resto li rifiuta.

**Perché senza Three.js.** Non c'è una scena: niente luci, niente geometrie,
niente camera. C'è una funzione da valutare per pixel. WebGL2 diretto sono un
triangolo a schermo intero e un frammento; Three.js peserebbe quanto il resto
del bundle per non fare nulla di ciò che serve. Le dipendenze di produzione
restano sedici.

**Le cinque condizioni che lo rendono innocuo**, e che sono la parte
interessante:

1. **Non blocca niente.** Sta dietro contenuto renderizzato sul server e già
   visibile: l'LCP non lo incontra.
2. **Senza WebGL non succede niente.** Nessun errore, nessun rettangolo vuoto:
   resta il gradiente di prima. Un ornamento che rompe ciò che ornava è il
   difetto peggiore che possa produrre.
3. **`prefers-reduced-motion` disegna un fotogramma e si ferma.** Chi le ha
   disattivate ha spesso una ragione medica, e un campo che pulsa è
   esattamente ciò che scatena un disturbo vestibolare. Resta l'immagine,
   sparisce il moto.
4. **Si sospende quando non si vede** — scheda in secondo piano, hero fuori
   schermo. Una GPU che macina per una pagina che nessuno guarda è batteria
   rubata a qualcuno.
5. **Costa poco per pixel:** densità limitata a 1,5 e risoluzione dimezzata
   sotto i 640px.

**Una nota sul silenzio.** Se lo shader non compila si rinuncia — ma **solo in
produzione**. In sviluppo si stampa il registro di compilazione, perché
rinunciare in silenzio anche lì sarebbe la forma di difetto numero uno di
COLLOQUIO.md scritta di propria mano: un refuso nel GLSL darebbe una pagina
identica a prima, e la causa verrebbe cercata ovunque tranne che nello shader.

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
