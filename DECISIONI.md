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
