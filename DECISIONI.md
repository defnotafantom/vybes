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
