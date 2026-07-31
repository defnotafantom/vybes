# Cosa ho preso dal vecchio Vybes, e cosa no

Audit di `Vybes-main` (Next 14, next-auth v4, 245 file, 40 modelli Prisma)
confrontato con questo progetto. Criterio: **migliore**, non semplicemente
**presente**. Dove il vecchio era più solido ho portato; dove era equivalente ho
lasciato stare; dove il nuovo è più avanti non ho toccato niente.

Il codice è stato **riscritto adattando**, non copiato: il vecchio è next-auth v4
con convenzioni diverse, e innestarlo così com'era avrebbe lasciato due modi di
fare la stessa cosa nello stesso progetto.

---

## Portato

| Cosa | Perché era meglio | Dove sta ora |
|---|---|---|
| **Compressione immagini nel browser** | Il pezzo migliore del vecchio codice. Un JPEG da 6 MB da telefono parte come WebP da poche centinaia di kB: upload più rapidi, meno storage, LCP migliore | `src/lib/image-client.ts` |
| **Validazione env al boot** | Una variabile dimenticata non dava errore, dava comportamenti sbagliati silenziosi. Ora `NEXT_PUBLIC_SITE_URL` mancante in produzione blocca l'avvio invece di far generare canonical verso il dominio sbagliato | `src/lib/env.ts` |
| **Geocoding Nominatim** | Colmava un buco che avevo documentato. Ho aggiunto cache e throttle a 1 req/s, che le policy di Nominatim richiedono e che nel vecchio mancavano | `/api/geocoding`, `AddressAutocomplete` |
| **Permessi per ruolo** | Asse separato dal ruolo di prodotto: un artista può moderare senza smettere di essere artista | `src/lib/permissions.ts` |
| **Health check** | Risponde in dieci secondi a "perché dà 500?" senza aprire i log di Vercel. Ho aggiunto la diagnostica della configurazione | `/api/health` |
| **Hook riusabili** | `useDebounce` era già scritto bene. `useLocalStorage` l'ho riscritto per non rompere l'idratazione | `src/hooks/` |
| **Google OAuth** | Meno attrito all'iscrizione, e l'indirizzo arriva già verificato | `src/lib/auth.ts` |
| **Analytics e Speed Insights** | Core Web Vitals dal traffico vero: sono gli stessi dati che Google usa come segnale | `layout.tsx` |
| **Service worker** | Ripulito: mette in cache solo asset statici e la pagina offline. Servire dalla cache un feed vecchio di giorni è peggio di un errore | `public/sw.js` |
| **Suite di test** | 2.000 righe di test veri. Riscritti su Vitest e sulle mie librerie: 81 unitari più 20 e2e | `tests/` |
| **Script operativi** | Il primo superadmin va creato per forza da riga di comando | `scripts/` |
| **Confine d'errore** | Isola un widget che esplode senza portare giù la pagina | `ErrorBoundary`, usato sulla mappa |
| **Sistema di toast** | Mancava del tutto un modo per dare riscontro all'utente | `src/components/Toast.tsx` |

---

## Non portato, e perché

### Il loro layer SEO
`lib/metadata.ts` (233 righe) non ha canonical, non ha hreflang, ha l'URL
dell'immagine social scritto a mano e prende il dominio da `NEXTAUTH_URL` con
fallback a `vybes.art`, che non è il dominio giusto. Nessuna sitemap
partizionata, nessun JSON-LD oltre a Organization. Qui il nuovo è più avanti su
ogni voce: sostituirlo sarebbe stato un passo indietro.

### `lib/sanitize.ts`
File vuoto, zero byte.

### Rate limit, prisma, notifiche
Equivalenti ai miei. Sostituirli avrebbe solo cambiato lo stile.

### Socket.io
Nel vecchio serve un `server.ts` custom, che su Vercel non gira. La chat qui usa
SSE, che passa dalle route handler standard.

---

## Il pezzo grosso ancora fermo: le feature di prodotto

Il vecchio Vybes ha 40 modelli Prisma contro i 22 di questo. La differenza non è
qualità, è **superficie di prodotto**: cose costruite che qui non esistono. Non
le ho portate perché sono decisioni tue, non miglioramenti oggettivi, e ognuna è
un progetto a sé.

**Livello social** — sondaggi nei post, reazioni oltre al mi piace, repost,
collezioni di preferiti, storie effimere, sezione trending, blocco e mute
utenti, segnalazioni, anteprima dei link. Circa 10 modelli e 15 API. È il gruppo
con il rapporto valore/costo migliore: sono meccaniche che fanno tornare le
persone.

**Gamification** — negozio avatar con valuta e transazioni, camerino di prova,
minigiochi (quiz e ruota della fortuna), achievement, ricompense giornaliere.
Circa 8 modelli e molto lavoro di interfaccia. Qui ci sono già livelli, XP,
reputazione e quest: questo è lo strato sopra.

**Amministrazione** — pannello admin con gestione utenti e ruoli, moderazione
contenuti, dashboard analytics, visite ai profili, statistiche post.
`src/lib/permissions.ts` è già portato, quindi le fondamenta ci sono: manca
l'interfaccia.

Il mio consiglio: nessuno dei tre, per ora. Il collo di bottiglia non è quanto
fa la piattaforma, è che il database è vuoto. Trenta artisti veri a Milano
valgono più di un negozio avatar.

---

## Cosa hanno trovato i test durante il port

Due difetti reali nel mio codice, non nel loro:

1. La matematica dei livelli era accoppiata al client Prisma e non si riusciva a
   importare da sola. Ora sta in `src/lib/levels.ts`, il che toglie Prisma anche
   dai componenti client che mostrano la barra di progresso.
2. `metaDescription` aveva una firma che, per via del default `as const`,
   impediva di passare un fallback diverso da quello predefinito.

È esattamente il tipo di cosa per cui si scrivono i test.

---

# Secondo passaggio: i componenti grafici

Audit del solo livello visivo del vecchio progetto (`components/`, 10.409
righe). Il loro stack è **framer-motion + lucide-react + shadcn/radix**: nessuno
dei tre era nel nuovo progetto, quindi "merge" qui significava scegliere, non
copiare.

## Il criterio: cosa costa e cosa vale

| Dipendenza | Peso | Decisione |
|---|---|---|
| `lucide-react` | ~1 kB per icona, tree-shakeable | **Presa.** Le emoji come icone (🔔 ♥ ☆ 💬) erano il buco visivo più evidente |
| `framer-motion` | ~50 kB gzip, su ogni pagina | **Scartata.** Il sistema di animazioni CSS costruito prima copre gli stessi effetti a costo zero. Su un progetto pensato per la SEO, mezzo megabit per far ruotare un logo non si giustifica |
| `shadcn/ui` + `@radix-ui/*` | 8 pacchetti | **Scartata in blocco, riscritte le primitive mancanti.** Importare shadcn avrebbe creato due sistemi di componenti nello stesso progetto: il loro `Button` e il mio `.btn-primary`, il loro `Card` e il mio `.card` |
| `clsx` + `tailwind-merge` | ~6 kB | **Scartate.** Servono a risolvere i conflitti fra utility quando un componente riceve classi arbitrarie dall'esterno: qui i punti d'ingresso sono pochi e controllati. `src/lib/cn.ts` fa il lavoro in tre righe |

## Preso, riscritto nel nostro idioma

| Componente | Cosa risolve |
|---|---|
| `ui/Avatar` | Le iniziali erano ripetute a mano in sei punti diversi. Il colore di sfondo è derivato dal nome, non casuale: lo stesso utente ha sempre la stessa tinta ovunque |
| `ui/Badge` + `RoleBadge` + `VerifiedBadge` | Loro avevano un `role-badge`; qui distingue artista da organizzatore e segnala i profili verificati |
| `ui/LoadingButton` | Lo spinner sostituisce l'icona ma **il testo resta**: cambiare l'etichetta fa cambiare larghezza al bottone, e quel salto sotto il dito dà fastidio |
| `ui/Tabs` | Non ne esistevano. Implementati col pattern WAI-ARIA: frecce, `aria-controls`, `tabIndex` gestito |
| `ui/OptimizedImage` | Segnaposto sfocato e **ripiego in caso di errore**: un file caricato dagli utenti può sparire dallo storage, e senza ripiego resta un rettangolo vuoto |
| `ui/ImageCarousel` | Su scroll-snap nativo. Una libreria di caroselli pesa 15-30 kB per reimplementare in JavaScript quello che il CSS fa da solo, di norma peggio |
| `Logo` | Vettoriale, con onda audio. L'originale ruotava con framer-motion, qui lo fanno due transizioni CSS |
| `RichText` | Menzioni, hashtag e link cliccabili nei post. Ricostruito con nodi React, **mai** `dangerouslySetInnerHTML`. I link esterni portano `rel="nofollow ugc"`, altrimenti la piattaforma diventa un bersaglio per lo spam di link il giorno dopo l'indicizzazione |
| `dashboard/Nav` | Sidebar desktop con indicatore di sezione, e un pannello a scomparsa su mobile al posto della fila di bottoni che andava a capo |

## Scartato, e perché

**`providers/language-provider.tsx` (1.004 righe)** — sistema di traduzione
IT/EN. Il progetto è italiano per scelta: il valore di ricerca sta nelle query
italiane ("DJ a Milano"). Mantenere due lingue raddoppierebbe le pagine per un
pubblico che non c'è.

**`landing/wave-animation.tsx`** — animazione decorativa con bolle in
framer-motion sulla landing. È la pagina che deve caricarsi più in fretta di
tutte: caricare una libreria di animazioni lì sopra è il posto peggiore
possibile.

**`stories/`, `rewards/`, `profile/fitting-room-modal.tsx`** — sono feature di
prodotto (storie effimere, ricompense, camerino avatar), non componenti
grafici. Restano nella lista delle decisioni aperte più sopra.

**`ui/toast.tsx`, `ui/skeleton.tsx`, `error-boundary.tsx`** — già esistenti qui,
scritti prima.

**`ui/select.tsx`** — il `<select>` nativo è più accessibile di quasi ogni sua
reimplementazione, e su mobile apre il selettore di sistema che gli utenti
conoscono già.
