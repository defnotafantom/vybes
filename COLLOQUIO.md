# Difendere il progetto

Se questo progetto sta al posto di un titolo di studio, il codice che gira è
solo metà del lavoro. L'altra metà è saperlo raccontare: chi ti intervista non
verifica se sai usare Next.js — quello lo dà per scontato guardando il repo —
ma se **le scelte le hai capite tu o le hai copiate**.

La differenza si sente in una domanda sola: *"perché così?"*.

---

## Come presentarlo in trenta secondi

> Vybes è una piattaforma che collega artisti e chi li ingaggia. La parte
> interessante non è il CRUD: è che il canale di acquisizione è la ricerca
> organica, e questo ha condizionato quasi ogni scelta tecnica. Ogni profilo e
> ogni ingaggio è una pagina statica servita dalla CDN con dati strutturati
> Schema.org, e c'è una directory locale che genera circa duecento pagine per
> intercettare ricerche tipo "DJ a Milano". Il problema più interessante che ho
> risolto è stato evitare che quelle duecento pagine, all'inizio vuote,
> danneggiassero il dominio invece di aiutarlo.

Funziona perché non elenca tecnologie: dichiara un vincolo di business e mostra
che l'architettura ne discende. E finisce su un problema, che è l'aggancio per
la domanda successiva.

**Da evitare:** "è un social network per artisti fatto in Next.js con Prisma e
Tailwind". Elenca strumenti, non decisioni, e non dà nulla su cui chiedere.

---

## Le domande che arrivano quasi sempre

### "Perché Next.js e non React con Vite?"

Perché il contenuto deve essere leggibile da un crawler senza eseguire
JavaScript. Con una SPA, Google renderizza in una seconda passata con ritardi
che vanno da giorni a settimane, e gli altri crawler spesso non lo fanno
affatto. Su un progetto la cui unica leva è la ricerca organica, è la scelta che
lo condanna.

Poi aggiungi la sfumatura, che è quella che distingue:

> Ma non è che uso Next "in modo statico". Uso **strategie diverse per tipo di
> pagina**: le pagine pubbliche sono statiche con rigenerazione, i profili più
> popolari li pre-genero al build e gli altri al primo accesso, la dashboard è
> dinamica, la ricerca è dinamica e in `noindex`.

### "Come funziona l'autenticazione?"

Auth.js v5, sessioni JWT in cookie `httpOnly`. Poi i dettagli che dimostrano che
ci hai pensato:

- bcrypt cost 12, circa 250 ms per hash: impraticabile per un attacco a
  dizionario, impercettibile per chi accede;
- i token di verifica e reset stanno nel database **come hash**: se qualcuno
  legge il database, i link in circolazione sono inutilizzabili;
- il recupero password risponde **sempre allo stesso modo**, altrimenti
  l'endpoint diventa uno strumento per scoprire quali email sono registrate.

**Se ti chiedono perché non sessioni nel database:** perché ogni richiesta
diventerebbe una query in più, e questo sito ha molte pagine pubbliche. Il
prezzo è che non posso revocare una sessione all'istante — un compromesso
consapevole, non una dimenticanza.

### "Come gestisci il real time?"

Qui c'è la risposta che vale più di tutte, perché racconta un vincolo capito
davvero:

> Server-Sent Events, non WebSocket. Socket.io richiede un server HTTP
> persistente, e l'App Router non ne espone uno: su Vercel non gira senza un
> server custom. Ma il vero problema era un altro: il bus di eventi in memoria
> funziona solo dentro un processo, e su serverless chi scrive e chi ascolta
> finiscono quasi sempre su istanze diverse. Quindi lo stream ha due sorgenti:
> il bus in memoria per la latenza zero sulla stessa istanza, e un tailing del
> database ogni due secondi che copre tutto il resto, con dedup per id.

**"E perché non Redis pub/sub?"** — è la domanda successiva, preparala:

> Perché per ricevere da Redis serve comunque una connessione persistente per
> istanza: su serverless torno al punto di partenza, con un servizio in più da
> pagare. Il database è già la fonte di verità e la query è indicizzata: costa
> meno.

### "Come eviti le query N+1?"

Mostra un caso concreto invece della definizione:

> Nella pagina `/citta` devo mostrare venti città con il numero di artisti e di
> ingaggi per ciascuna. Fatto ingenuamente sono quarantuno query. Uso due
> `groupBy` aggregate e costruisco due `Map` in memoria: tre query in totale,
> indipendentemente da quante città ci sono.

### "Come hai gestito la sicurezza degli upload?"

> Il tipo MIME dichiarato dal client è banale da falsificare, quindi il server
> verifica i **magic bytes**, i primi byte del file, che devono corrispondere al
> formato. Poi c'è un limite di dimensione e una lista chiusa di tipi
> consentiti. La compressione lato client è un'ottimizzazione separata: riduce
> il tempo di caricamento e il costo dello storage, ma non è un controllo di
> sicurezza e non la tratto come tale.

### "Cosa testi, e cosa non testi?"

La parte interessante è la seconda:

> Unitari su tutta la logica pura e end-to-end sui percorsi critici. **Non
> scrivo test di componente**: verificano soprattutto che il markup sia quello
> che è, si rompono a ogni ritocco di layout e raramente trovano bug veri.
>
> La cosa di cui vado più fiero sono i test e2e sull'infrastruttura SEO:
> verificano che `robots.txt` dica `Allow`, che la sitemap usi il dominio giusto
> e non quello del deployment, che il canonical ci sia e che il JSON-LD sia
> valido. Sono errori che non rompono la build e di cui ti accorgi settimane
> dopo guardando Search Console. È esattamente ciò che un test deve intercettare.

### "Qual è la parte di cui vai più fiero?"

Non rispondere con una feature. Rispondi con un problema:

> La difesa dal contenuto povero. La directory locale genera venti città per
> dieci discipline, duecento pagine, e all'inizio sono quasi tutte vuote. Google
> penalizza i domini che gli segnalano centinaia di pagine senza contenuto, e la
> penalità ricade anche sulle pagine buone. Quindi c'è una soglia configurabile:
> sotto quella, le pagine restano raggiungibili e linkate internamente ma escono
> da sitemap e indice.
>
> Mi piace perché è una decisione che non si vede guardando il sito, e che senza
> aver capito come funziona un crawler non avrei nemmeno saputo di dover
> prendere.

### "Cosa rifaresti diversamente?"

Domanda-trappola: chi risponde "niente" perde punti. Hai tre risposte vere:

1. **Lo schema senza enum né array nativi.** Nato per la portabilità da SQLite,
   ora che il target è Postgres è solo leggibilità e vincoli in meno.
2. **Il monitoraggio errori dal primo giorno.** Senza, un 500 in produzione lo
   scopri solo se qualcuno lo segnala, e la maggior parte se ne va e basta.
3. **I test prima, non dopo.** Aggiunti a lavoro avanzato, hanno subito trovato
   due difetti di *progettazione* delle firme: la matematica dei livelli
   accoppiata al client del database, e una firma che rendeva impossibile
   passare un fallback. Scritti prima li avrei prevenuti invece che diagnosticati.

### "Cosa manca al progetto?"

Rispondere con onestà e con criterio vale più che fingere completezza:

> Tre categorie diverse. **Configurazione** — Redis per il rate limiting
> globale, Sentry per il monitoraggio: mezz'ora ciascuno. **Prodotto** — livello
> social, gamification avanzata, pannello di amministrazione: sono scelte, non
> lacune, e le ho documentate con una raccomandazione. **E il punto vero**: il
> database è vuoto. Nessuna feature sposta l'ago finché non ci sono trenta
> artisti reali in una città. Ho scritto uno script apposta per creare i profili
> al posto loro, perché la frizione dell'iscrizione è l'ostacolo, non la
> mancanza di interesse.

---

## Il capitolo più forte: quattordici difetti, e perché nessuno li aveva visti

Questo è il materiale migliore che hai, ed è meglio di qualunque scelta
architetturale. Le decisioni su una pagina bianca le sa raccontare chiunque
abbia letto la documentazione giusta. Trovare i difetti in qualcosa che gira
già, capire perché sono passati, e cambiare il processo perché non ripassino —
quello lo sa fare chi ha lavorato davvero.

### Come introdurlo

> A un certo punto ho smesso di aggiungere funzionalità e ho percorso il sito
> come se fossi un utente che ci arriva da Google. In due giorni ho trovato
> quattordici difetti. Nessuno era nel codice complicato: erano tutti nei punti
> di giunzione.

### I quattro che raccontano meglio

**1. La sessione che sembrava scadere.** Gli utenti venivano rimandati al login
con una sessione valida. Auth.js spezza il cookie in parti numerate quando il
token supera i quattromila byte; il middleware cercava il nome esatto e non lo
trovava. Era intermittente perché la dimensione del token dipende da cosa
contiene — chi entrava con Google, che ha un URL di avatar lungo, lo
incontrava; gli altri no.

Perché è una buona storia: il sintomo («scade la sessione») indicava un
componente che funzionava benissimo, e la causa stava altrove.

**2. Il login perdeva la destinazione.** Il middleware passava alla pagina di
accesso il percorso ma non la query. Chi cliccava «Contatta» su un profilo
tornava, dopo il login, in un elenco di messaggi vuoto senza più sapere chi
volesse contattare. Lo stesso difetto era sull'altra metà dell'imbuto.

Perché è una buona storia: `pathname` senza `search` è una stringa
perfettamente valida. Nessuno strumento poteva vederlo, e la revisione umana lo
aveva letto e approvato.

**3. La registrazione finiva sulla pagina di login.** In produzione la verifica
email è obbligatoria, quindi l'accesso automatico dopo l'iscrizione non poteva
riuscire. Il fallimento non veniva controllato: si proseguiva verso la
dashboard, il middleware non trovava il cookie, e rimbalzava al login. Chi si
era appena iscritto si ritrovava davanti a un modulo di accesso senza una
parola. L'API restituiva `verificationRequired` dal primo giorno; il modulo lo
ignorava.

Perché è una buona storia: colpiva **ogni singola iscrizione**, in produzione,
e nessun test falliva.

**4. Dal telefono il sito non aveva navigazione.** `hidden md:flex`: sotto i
768px sparivano artisti, ingaggi, città e mappa. Su un progetto la cui unica
fonte di traffico è la ricerca — e le ricerche arrivano da telefono — significa
che chi atterrava su una pagina di città non poteva andare da nessun'altra
parte.

### La diagnosi, che è la parte che conta

Se ti chiedono «perché non li avevi visti», questa è la risposta:

> Perché i controlli guardavano le pagine, e nessuno di quei difetti sta dentro
> una pagina. Stanno nei passaggi fra una pagina e l'altra: dove si finisce
> dopo il login, cosa vedi quando una lista è vuota, cosa può fare chi arriva
> da fuori. È la parte che si scrive per ultima, si guarda una volta, e non si
> riapre più.
>
> Il typecheck non poteva prenderli: erano tutte espressioni valide. Il lint
> nemmeno. I test end-to-end coprivano autenticazione, navigazione e SEO — le
> cose che si scrivono per prime — e verificavano che le pagine rispondessero.
> Le pagine rispondevano tutte.

### Cosa hai cambiato, che è la conclusione

> Ho scritto i test che li avrebbero presi, con una regola sola: **ogni test
> verifica dove si finisce, non che qualcosa esista.** Se un test si può
> soddisfare rispondendo 200, non sta verificando niente di ciò che rompe
> l'esperienza.
>
> E per il difetto che aveva riscritto un file di rotta con una copia della
> landing — quello che faceva dichiarare a ogni profilo artista
> `canonical: "/"`, cioè «la pagina vera è la home» — ho scritto un controllo
> che confronta il percorso dichiarato con la posizione del file nell'albero
> delle rotte. Gira in CI. Quel difetto avrebbe deindicizzato da solo il tipo
> di pagina su cui poggia tutta la strategia, in silenzio, e ce ne saremmo
> accorti mesi dopo guardando il traffico che non arrivava.

### Se ti chiedono un difetto di sicurezza

> Il parametro di ritorno dopo il login finiva diritto in un reindirizzamento:
> un *open redirect*. Bastava `/accedi?next=https://sito-falso.example` per
> costruire un'esca — la vittima vede il dominio giusto, si fida, e dopo
> l'accesso finisce su un clone che le chiede di rifarlo. Con le registrazioni
> aperte il link si distribuisce mettendolo in un profilo.
>
> La difesa è una lista di ciò che è permesso, non di ciò che è vietato: si
> accettano solo percorsi interni. E copre anche `//sito.example`, che i
> browser leggono come URL assoluto — è il modo più comune di aggirare un
> controllo che guarda solo la prima barra.

---

## Domande difficili, e come non cadere

**"Non è sovradimensionato per un progetto senza utenti?"**

> In parte sì, ed è consapevole. Ma le due cose che sembrano eccessive — il
> layer SEO e i test sull'infrastruttura — sono esattamente quelle che *devono*
> esistere prima degli utenti: la SEO è il canale di acquisizione, e aggiungerla
> dopo significa rifare le URL, che è la cosa più costosa che si possa fare a un
> sito indicizzato.

**"Perché non hai usato una libreria di componenti?"**

> Perché nel progetto precedente shadcn conviveva già con classi Tailwind
> scritte a mano: due sistemi per fare la stessa cosa. È il debito peggiore
> perché non si nota finché non è ovunque. Le primitive che mancavano le ho
> scritte, sono cinquanta righe ciascuna, e nessuna si comporta in modo inatteso
> perché sono leggibili per intero.

**"Quanto di questo l'hai scritto tu?"**

Rispondi con onestà, e sposta il discorso dove sei forte:

> Ho usato assistenza AI, come si fa oggi in qualsiasi team. Quello che
> distingue il risultato sono le decisioni: perché SSE invece di WebSocket,
> perché la soglia sul contenuto povero, perché il rate limiter si degrada
> invece di bloccare. Sono documentate una per una in `DECISIONI.md`, con le
> alternative che ho scartato e il prezzo di ognuna. Chiedimi di una qualsiasi.

Questa risposta funziona perché è vera e perché sposta il terreno dalla
digitazione al ragionamento — che è l'unica cosa che conta davvero.

---

## Cosa fare prima di metterlo sul CV

| | Perché conta |
|---|---|
| **Mettilo online davvero** | Un link che si apre vale dieci repository. Prima di allora è codice, non un progetto |
| **README con screenshot** | Chi guarda decide in venti secondi se vale la pena leggere |
| **Cronologia git leggibile** | Commit descrittivi e progressivi raccontano come lavori. Un unico commit "initial" dice il contrario |
| **CI verde e visibile** | Il badge in cima al README dimostra che i test esistono e passano |
| **Riempi una città** | Trenta artisti veri. Un sito vuoto, per quanto ben costruito, sembra un esercizio |
| **Rileggi `DECISIONI.md`** | Devi poter spiegare a voce ogni ADR senza rileggerlo |
| **Sappi raccontare i difetti** | È il capitolo che ti distingue: chiunque sa difendere le proprie scelte, quasi nessuno sa raccontare cosa ha sbagliato e cosa ha cambiato di conseguenza |

**Sulla cronologia git, un consiglio che vale più di quanto sembri.** I messaggi
di commit di questo progetto spiegano il *perché*, non il *cosa* — «la
registrazione non finiva da nessuna parte» e poi il ragionamento, non «fix
RegisterForm». Se chi ti valuta apre il repository, `git log` è la prima cosa
che legge, e da solo racconta come lavori. Non riscriverlo per farlo sembrare
più ordinato: la sequenza vera, con i difetti trovati e corretti, dice di più
di una storia pulita.

---

## Le cinque cose da saper spiegare a memoria

Se ricordi solo cinque cose, che siano queste:

1. **Perché statico e non SPA** → il crawler deve leggere senza eseguire JS.
2. **Le due connessioni Neon** → pooler per le query, diretta per le
   migrazioni, e senza la seconda le migrazioni si bloccano senza errore chiaro.
3. **SSE con due sorgenti** → il bus in memoria non basta su serverless, il
   tailing del database garantisce la consegna.
4. **La soglia sul contenuto povero** → duecento pagine vuote danneggiano il
   dominio, quindi restano fuori dall'indice finché non hanno contenuto.
5. **Il rate limiter si degrada** → se Redis cade si prosegue, perché un rate
   limiter rotto non deve diventare un sito irraggiungibile.

Sono cinque risposte che nessuno può dare avendo solo copiato un tutorial.

E una sesta, che vale da sola quanto le altre cinque:

6. **Perché quattordici difetti erano sfuggiti a typecheck, lint, test e
   revisione** → perché tutti guardavano *dentro* le pagine, e i difetti
   stavano nei passaggi *fra* le pagine. Da lì la regola nuova: un test
   verifica dove si finisce, non che qualcosa esista.

La differenza fra i primi cinque punti e il sesto è che i primi li puoi
imparare, il sesto lo puoi solo aver vissuto. È quello che ti distingue da chi
porta un progetto costruito e mai messo alla prova.
