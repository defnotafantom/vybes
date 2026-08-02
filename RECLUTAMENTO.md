# I primi venti artisti

La voce più importante di `ORDINE.md`, e l'unica che nessuna riga di codice
può chiudere.

**Perché conta più di tutto il resto.** Ogni altra cosa migliora qualcosa che
già funziona; questa stabilisce se il progetto ha ragione di esistere. Una
piattaforma a due lati non si valuta dal codice: si valuta dal fatto che chi
cerca un chitarrista a Milano ne trovi venti. Oggi ne trova sei, quasi tutti
di esempio.

È anche l'unico modo di superare il limite visivo: finché i profili non hanno
fotografie vere, ogni griglia resta un muro di rettangoli vuoti, e nessun
lavoro sul CSS lo compensa.

---

## Una città sola

Venti artisti sparsi in venti città non servono a nessuno: chi cerca a Milano
trova un profilo e se ne va. Venti a Milano fanno una directory che funziona,
e sono anche la soglia oltre la quale ha senso mostrarla a un organizzatore.

Milano perché è il mercato più grande, ma va bene qualunque città in cui
**conosci già delle persone**. Il primo artista lo convinci perché ti fidi tu,
non perché il sito è bello.

---

## Il messaggio

Da adattare, non da copiare parola per parola: se sembra un modello, lo sembra
anche a chi lo riceve. Funziona meglio via messaggio diretto su Instagram che
via email.

> Ciao [nome], ho visto [cosa concretamente — il video del live al Circolo, il
> pezzo nuovo]. Sto costruendo Vybes, una specie di elenco pubblico di artisti
> in Italia dove locali e organizzatori cercano chi ingaggiare. È appena
> partito e sto mettendo dentro i primi venti a Milano.
>
> Ti va se ti faccio la pagina? Ci metto due minuti, mi serve solo: due righe
> su cosa fai, la città, e due o tre link ai tuoi lavori. Diventa una pagina
> tua su Google, tipo vybeshub.art/artisti/tuo-nome — gratis, e la puoi
> cancellare quando vuoi con un clic.

**Perché funziona.** Apre con una cosa specifica che hai visto davvero: senza
quella è spam. Non chiede di iscriversi — chiede il permesso di fare una cosa
al posto suo. Dice cosa ci guadagna in termini che gli interessano (una pagina
indicizzata gratis, non «entra nella nostra community»). E chiude dicendo che
può andarsene: è la frase che toglie il sospetto, e nel nostro caso è vera
perché la cancellazione dell'account è implementata sul serio.

**Cosa non dire.** Non promettere ingaggi: non ne hai da dare, e la prima
promessa non mantenuta chiude il rapporto anche per dopo. Non dire «siamo un
team»: sei tu, e si vede.

---

## Cosa chiedere

Quattro cose, in un messaggio solo. Chiederne otto significa non ricevere
risposta.

1. **Due o tre frasi su cosa fa.** Servono almeno 120 caratteri, altrimenti il
   profilo non entra nell'indice — ma non dirglielo così: chiedi «come ti
   descriveresti a un locale che non ti conosce».
2. **La città.**
3. **Due o tre link** ai suoi lavori: video, brani, foto.
4. **Un'email**, per creargli l'accesso.

Se manda anche una foto, meglio. Se non la manda, non insistere al primo
scambio: il profilo funziona lo stesso e la foto si aggiunge dopo.

---

## Il consenso

Pubblicare nome, foto e opere di una persona richiede una base giuridica, e
«me l'ha detto a voce» non è dimostrabile sei mesi dopo. Serve qualcosa di
scritto — un messaggio va benissimo, non serve un modulo firmato.

Chiedi che ti risponda con qualcosa di equivalente a questo:

> Autorizzo Vybes a pubblicare il mio nome, la mia biografia, le immagini e i
> link che ho fornito, sul sito vybeshub.art. So che posso chiedere la
> modifica o la cancellazione in qualsiasi momento scrivendo a [tua email].

**Conserva quel messaggio.** Uno screenshot in una cartella basta, ma deve
esistere: è l'unica cosa che dimostra il consenso se qualcuno lo contesta.

Nel file JSON, il campo `consenso` serve a costringerti ad averlo raccolto
prima di importare — scrivici dove l'hai salvato, per esempio `"DM Instagram
12/08, screenshot in consensi/marco.png"`. Lo script rifiuta le righe in cui
è vuoto.

---

## Il file

Uno per città, in una cartella `dati/` che **non va versionata**: contiene
email di persone reali. Aggiungi `dati/` al `.gitignore` prima di crearla.

```json
[
  {
    "email": "marco.rossi@example.com",
    "nome": "Marco Rossi",
    "discipline": ["musicisti", "cantanti"],
    "citySlug": "milano",
    "headline": "Chitarrista e cantautore, repertorio acustico",
    "bio": "Suono da dodici anni tra Milano e la Brianza, soprattutto in locali piccoli dove si sente il legno della chitarra. Repertorio mio e riletture di cantautorato italiano, dal vivo da solo o in duo con contrabbasso.",
    "consenso": "DM Instagram 12/08, screenshot in consensi/marco.png",
    "image": "https://…",
    "instagram": "https://instagram.com/marcorossi",
    "portfolio": [
      {
        "titolo": "Live al Blue Note, marzo 2026",
        "mediaUrl": "https://youtube.com/watch?v=…",
        "tipo": "video",
        "anno": 2026
      }
    ]
  }
]
```

I campi `discipline` usano gli slug che trovi in `src/lib/constants.ts`:
`musicisti`, `cantanti`, `dj`, `band`, `ballerini`, `attori`, `fotografi`,
`videomaker`, `illustratori`, `comici`.

Poi:

```powershell
npm run artisti:importa -- dati/milano.json              # mostra e non scrive
npm run artisti:importa -- dati/milano.json --conferma
```

Lo script è idempotente sull'email: se correggi il file e rilanci, aggiorna
invece di duplicare. Segnala con `⚠` i profili che **non supereranno la soglia
di indicizzazione** e dice cosa manca — di solito la biografia troppo corta o
nessun lavoro nel portfolio.

L'accesso lo crea con una password casuale che non viene mostrata: se l'artista
vuole entrare e modificarsi il profilo, usa «password dimenticata» con la sua
email. È di proposito — così la password non passa da nessuna chat.

---

## Dopo i primi cinque

Fermati e guarda `/artisti` e `/citta/milano`. Se sembra ancora vuoto, il
problema non è il numero: è che mancano le fotografie, oppure le biografie si
somigliano tutte. Meglio scoprirlo al quinto che al ventesimo.

Quando arrivi a venti, e solo allora, registra il sito su **Search Console** e
invia la sitemap. Un dominio nuovo viene valutato su ciò che la prima
scansione trova: presentarsi con sei profili di esempio significa farsi
misurare nel momento peggiore.
