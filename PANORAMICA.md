# Vybes — stato del progetto

Fotografia di dove siamo. Tre parti: **cos'è**, **cosa è risolto**, **cosa
resta** — e quest'ultima divisa fra ciò che blocca il lancio, ciò che è una tua
decisione, e ciò che è debito tecnico da tenere d'occhio.

---

# 1 · Cos'è

Una piattaforma che collega artisti e chi li ingaggia. Due tipi di utente:
l'**artista**, che costruisce un profilo pubblico con portfolio e si candida
agli ingaggi; l'**organizzatore** (locale, festival, agenzia), che pubblica
annunci e valuta le candidature.

La scommessa strategica è che il canale di acquisizione principale sia la
**ricerca organica**. Non "un social con anche delle pagine", ma un sito dove
ogni profilo artista e ogni ingaggio è una pagina pubblica costruita per
intercettare ricerche come "DJ a Milano" o "cercasi cantautore Bologna". È la
ragione di quasi tutte le scelte tecniche che seguono.

**Numeri**: 33 pagine, 25 route API, ~45 componenti, 22 moduli di libreria,
19 modelli di database, 84 test unitari più 20 end-to-end.

---

# 2 · Cosa è risolto

## 2.1 L'impianto SEO

Questa è la parte più densa del progetto e quella che non si vede.

**Metadata centralizzati.** Un unico `buildMetadata()` che ogni pagina chiama:
canonical assoluto, hreflang, Open Graph e Twitter card sempre coerenti. Non
esistono pagine con metadata scritti a mano che possano divergere nel tempo.

**Dati strutturati.** Schema.org generato lato server: `Person` e `MusicGroup`
per gli artisti, `Event` con `Offer` e `Place` per gli ingaggi — che è il tipo
candidabile ai rich result di Google, quelli con data e luogo direttamente nei
risultati. Più `ItemList`, `BreadcrumbList`, `FAQPage`, `CreativeWork`.

**Sitemap partizionata.** Un indice verso cinque file separati, ognuno con una
propria cadenza di aggiornamento. Gli eventi passati scendono di priorità
automaticamente, per non far sprecare a Google il tempo di scansione su pagine
che non cambiano più.

**Directory locale.** 20 città × 10 discipline: la struttura che intercetta la
long tail. `/citta/milano/artisti/dj` è una pagina vera, con testo introduttivo
diverso da città a città per non essere contenuto duplicato.

**Difesa dal thin content.** 200 combinazioni città×disciplina sono, all'inizio,
quasi tutte vuote. Le pagine sotto soglia restano raggiungibili e linkate ma
fuori da sitemap e indice. Segnalare a Google duecento pagine che dicono
"nessun profilo" non porta traffico: abbassa la valutazione del dominio e la
frequenza con cui torna a visitare anche le pagine buone.

**Rendering.** Le pagine pubbliche sono statiche con rigenerazione periodica,
servite dalla CDN. Quando pubblichi un ingaggio, `revalidatePath()` rigenera
solo le pagine che lo mostrano — non l'intero sito.

## 2.2 Le funzionalità

Tutto quello che c'era nella tua analisi iniziale è implementato e collegato:
autenticazione con verifica email e recupero password, feed con post, like,
commenti, salvataggi, tag e collaborazioni, ingaggi con candidatura,
accettazione e rifiuto, portfolio, chat, notifiche, ricerca, quest e livelli,
mappa, modifica e annullamento eventi, geocoding degli indirizzi.

Tre cose che erano scollegate — bottone segui, thread commenti, salvataggio
post — avevano l'API ma nessun modo di attivarle dall'interfaccia. Ora ce l'hanno.

## 2.3 L'infrastruttura

**Upload.** Le immagini vengono ridimensionate e convertite in WebP nel
browser prima di partire: un JPEG da 6 MB scattato col telefono arriva come
poche centinaia di kB. Lato server si controllano i **magic bytes**, non il tipo
MIME dichiarato dal client, che è banale da falsificare.

**Rate limiting.** Con Upstash Redis configurato il contatore è condiviso da
tutte le istanze; senza, vale per singola istanza. Se Redis smette di
rispondere si ricade sulla memoria invece di bloccare: un rate limiter rotto non
deve diventare un guasto del sito.

**Chat.** Stream SSE con due sorgenti: il bus in-process, istantaneo, e il
tailing del database ogni 2 secondi, che copre i messaggi scritti da altre
istanze. Su Vercel chi scrive e chi ascolta finiscono quasi sempre su funzioni
diverse, quindi la seconda è quella che garantisce la consegna.

**Diagnostica.** `/api/health` risponde in un colpo solo se il database è
raggiungibile, quali funzionalità sono configurate e quali variabili d'ambiente
mancano. È il primo posto da guardare quando qualcosa non va.

**Validazione dell'ambiente.** In produzione una variabile critica mancante
blocca l'avvio invece di produrre comportamenti sbagliati in silenzio.

## 2.4 L'aspetto

Sistema di design con token, scala colore completa, ombre a due strati e sette
animazioni riusabili. Transizioni tra pagine che **non animano il primo
caricamento**, perché un fade-in ritarderebbe la metrica LCP che Google usa come
segnale. Skeleton che replicano il rapporto d'aspetto dei componenti veri, per
non generare scatti di layout. Icone vettoriali al posto delle emoji. Tutto si
azzera sotto `prefers-reduced-motion`, che per chi soffre di disturbi
vestibolari non è un vezzo.

## 2.5 La qualità

84 test unitari e 20 end-to-end. Gli e2e verificano che robots, sitemap,
canonical e dati strutturati non regrediscano: sono errori che non rompono la
build e di cui ci si accorge settimane dopo, guardando Search Console.

I test hanno già trovato due difetti reali durante la scrittura: la matematica
dei livelli era accoppiata al client del database e non si riusciva a importare
da sola, e `metaDescription` aveva una firma che impediva di passare un
fallback diverso da quello predefinito.

---

# 3 · Cosa resta

## 3.1 Blocca il lancio — nove passi manuali

Sono tutti in [MANUALE.md](./MANUALE.md), con i comandi esatti. In sintesi:

| | Cosa | Perché blocca |
|---|---|---|
| 1 | **Ruotare le credenziali** | Neon, Blob e `AUTH_SECRET` sono stati incollati in chiaro in chat: vanno considerati pubblici |
| 2 | **Generare e committare la prima migrazione** | Lo script di build applica le migrazioni presenti nel repo. Se la cartella non c'è, il deploy non crea nessuna tabella |
| 3 | **Configurare Resend** | Senza, nessuno riceve l'email di conferma |
| 4 | **Impostare le variabili su Vercel** | `NEXT_PUBLIC_SITE_URL` su tutte: senza, Google indicizza il dominio `.vercel.app` invece del tuo |
| 5 | **Verificare con `/api/health`** | Un solo controllo copre metà dei problemi possibili |

Tempo stimato: due ore e mezza.

## 3.2 Decisioni tue, non problemi tecnici

Il vecchio progetto ha 40 modelli di database contro i 19 di questo. La
differenza non è qualità, è **superficie di prodotto**: cose che esistevano lì e
qui no. Non le ho portate perché sono scelte che spettano a te, e ognuna è un
progetto a sé. Analisi completa in [PORT.md](./PORT.md).

**Livello social** — sondaggi, reazioni oltre al mi piace, repost, collezioni di
preferiti, storie effimere, trending, blocco utenti, segnalazioni. Circa 10
modelli e 15 API. È il gruppo con il miglior rapporto valore/costo: sono
meccaniche che fanno tornare le persone.

**Gamification avanzata** — negozio avatar con valuta e transazioni, minigiochi,
achievement, ricompense giornaliere. Livelli, XP e quest ci sono già: questo è
lo strato sopra. Molto lavoro di interfaccia.

**Pannello amministrazione** — gestione utenti e ruoli, moderazione, analytics.
I permessi per ruolo sono già portati, manca l'interfaccia. Diventa necessario
quando gli utenti crescono e serve moderare.

**Il mio consiglio: nessuno dei tre, per ora.** Il collo di bottiglia non è
quanto fa la piattaforma.

## 3.3 Debito tecnico, da tenere d'occhio

| Cosa | Rischio | Quando affrontarlo |
|---|---|---|
| **`next-auth@5` in beta** | Basso ma reale. Non ha soluzione: la v4 non supporta l'App Router e le alternative significherebbero riscrivere l'autenticazione. Versione fissata e coperta dai test e2e | Se la beta rompe qualcosa, i test lo dicono prima degli utenti |
| **Chat con latenza fino a 2 s** | Nessuno oggi. Se la chat diventasse centrale, si passa a un servizio dedicato | Quando qualcuno se ne lamenta |
| **Rate limit per istanza senza Redis** | Reale su traffico alto: il limite effettivo è N volte quello dichiarato | Cinque minuti di configurazione, farlo prima di aprire al pubblico |
| **Nessun monitoraggio errori** | Un 500 in produzione lo scopri solo se qualcuno te lo dice | Sentry, mezz'ora |
| **Privacy e termini sono bozze** | Legale, non tecnico | Prima di raccogliere dati di utenti veri |
| **Nessun blog** | Manca il canale per la long tail informazionale ("quanto costa ingaggiare una band") | Quando il sito ha contenuti e serve una seconda fonte di traffico |
| **Rotte `/en` inesistenti** | Nessuno: l'hreflang è correttamente disattivato | Solo se emerge un pubblico non italiano |

---

# 4 · Il punto che conta più di tutti gli altri

Il codice è pronto. **Il database è vuoto.**

Ci sono circa 200 pagine di directory locale che con sei artisti demo dicono
quasi tutte "nessun profilo trovato". Il codice si difende — quelle pagine
restano fuori dall'indice — ma questo evita il danno, non crea il traffico.

Nessuna delle cose elencate al punto 3.2 sposta l'ago. Un negozio avatar su una
piattaforma senza artisti è un negozio vuoto dentro un centro commerciale vuoto.

**Cosa fare invece:**

1. **Scegli una città.** Quella dove hai più contatti veri, non la più grande.
2. **Portaci 20-30 artisti reali**, con foto, bio e almeno un lavoro nel
   portfolio. Trenta profili pieni in una città posizionano; trecento vuoti
   sparsi in venti città no.
3. **Pubblica 5-10 ingaggi veri** nella stessa città. Anche piccoli: sono le
   pagine con i dati strutturati `Event`, quelle che possono finire nei rich
   result di Google.
4. **Poi, e solo poi, apri la seconda città.**

I primi trenta profili non arrivano da soli. Vanno contattati uno per uno —
locali che conosci, musicisti su Instagram, scuole di danza, collettivi. E
conviene offrire di **compilare tu il profilo al posto loro**: la frizione
dell'iscrizione è l'ostacolo vero, non la mancanza di interesse. C'è uno script
apposta, `npx tsx scripts/crea-utente.ts`, che crea l'account e ti dà le
credenziali da mandare.

Quando una città funziona, il resto è replicabile. Prima di allora, ogni ora
spesa sul codice è un'ora sottratta all'unica cosa che serve.

---

## Documenti collegati

| File | Contenuto |
|---|---|
| [MANUALE.md](./MANUALE.md) | I passi manuali per arrivare online, con i comandi |
| [README.md](./README.md) | Architettura, rotte, scelte tecniche |
| [PORT.md](./PORT.md) | Cosa è stato preso dal vecchio progetto e perché |
