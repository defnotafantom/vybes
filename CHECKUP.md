# Vybes come biglietto da visita: cosa regge e cosa no

Scritto per rispondere a una domanda sola: **questo progetto è pronto per
essere messo davanti a un'azienda al posto di una laurea?**

La risposta breve è sì, ma non per il motivo che verrebbe da dare. Non perché
il sito sia finito — non lo è, e fingere il contrario è la cosa più pericolosa
che si possa fare in un colloquio. Regge perché c'è **la traccia scritta di
come è stato pensato**, ed è quella la cosa rara.

---

## 1. I numeri, senza aggettivi

| | |
|---|---|
| Codice applicativo | 213 file, ~23 700 righe TypeScript |
| Rotte pagina / API | 36 / 32 |
| Modelli dati | 24, con 7 migrazioni versionate |
| Prove automatiche | 269 unitarie + 47 end-to-end su 4 profili di dispositivo |
| Decisioni documentate | 50 ADR in `DECISIONI.md` |
| Controlli in CI | tipi, lint, formato, canonical, variabili CSS, test, build |
| Dipendenze di produzione | 16 |

Sedici dipendenze di produzione su un progetto di questa dimensione è un dato
che un tecnico nota. Vuol dire che il raggruppamento dei marker sulla mappa,
il generatore casuale con seme e la logica della ruota sono scritti a mano —
non per orgoglio, ma perché ognuna di quelle scelte è argomentata.

---

## 2. Cosa rende questo progetto diverso da un altro portfolio

Quasi tutti i progetti da portfolio si somigliano: un CRUD, un'autenticazione,
un deploy, un README con gli screenshot. Il selezionatore ne ha visti cento e
non li distingue.

Qui ci sono tre cose che quasi nessuno porta.

**`DECISIONI.md`, 50 ADR.** Non «cosa ho usato» ma «perché, e cosa ho
scartato». Compresi i casi in cui una decisione ne corregge una precedente
(ADR-047 corregge ADR-042 perché una premessa era sbagliata). Un documento che
ammette di aver cambiato idea vale più di dieci che hanno sempre ragione.

**`COLLOQUIO.md`, e le quattro forme dei difetti.** Circa cinquanta difetti
trovati **usando il prodotto**, classificati in quattro forme ricorrenti:

1. il sistema dice di sì e non fa niente;
2. la regola esiste e niente la applica;
3. una difesa vale in una direzione sola;
4. la prova accusa il prodotto invece di sé stessa.

Diversi di quei difetti li ho introdotti io e sono documentati come tali. È la
differenza fra «so scrivere codice» e «so cosa va storto nel codice», che è la
domanda vera di un colloquio tecnico.

**I commenti spiegano il perché, non il cosa.** Chi apre
`src/lib/reputazione.ts` trova scritto perché la reputazione non si accumula,
cosa succedeva prima, e quale difetto quella scelta previene. È la prova più
diretta che esista di come una persona ragiona.

---

## 3. Cosa manca per dire «al 100%»

Onestamente, quattro cose. Nessuna impedisce di candidarsi; due impediscono di
raccontare il progetto come «lanciato».

### 3.1 Nessun utente reale — il vero limite

Il sito è online, funzionante e vuoto. Ogni funzione è stata provata da una
persona sola. Non si può dire «ho lanciato un prodotto»: si può dire «ho
costruito e messo in produzione un prodotto completo», che è vero e già molto.

*Cosa lo chiude:* cinque artisti veri a Milano. Da lì in poi ogni numero
diventa citabile.

### 3.2 Revisione legale di `/privacy` e `/termini`

Il sito tratta dati personali di persone reali in Europa. I testi ci sono e
sono ragionati, ma **non sono stati letti da un avvocato**. Finché non lo sono,
il sito non va promosso attivamente presso il pubblico.

Non è un problema per il CV — nessuno chiede la conformità di un progetto
personale — ma è un rischio reale se il sito cresce.

### 3.3 L'accessibilità è curata e non è misurata

Nel codice c'è molta attenzione vera: `prefers-reduced-motion` rispettato in
JS e CSS, bersagli tattili da 44px, `aria-label` scritti per essere letti,
contrasti calcolati sul caso peggiore, WCAG 2.5.3 citata dove serve.

Manca un **controllo automatico** (`axe`) che lo renda verificabile. Oggi è una
qualità che si può solo raccontare; con axe in CI diventa un numero.

### 3.4 Non c'è un riepilogo in inglese

Tutto — codice, commenti, documenti — è in italiano. È una scelta deliberata e
difendibile per un prodotto italiano, ma restringe il pubblico: molte aziende
italiane fanno lo screening in inglese, e chiunque fuori dall'Italia si ferma
alla prima riga.

*Cosa lo chiude:* un `README.en.md` di una pagina. Non tradurre tutto — il
resto in italiano diventa anzi un dettaglio caratterizzante.

---

## 4. A quali aziende ha senso presentarlo

Il progetto dice tre cose su chi lo ha fatto: **sa portare qualcosa dall'idea
alla produzione da solo**, **ragiona sul prodotto e non solo sul codice**, e
**scrive**. Le aziende dove quelle tre cose contano non sono tutte.

### Alta compatibilità

**Product company e scale-up italiane** (marketplace, SaaS B2C/B2B, fintech,
travel, food-tech). Stack quasi identico — TypeScript, React/Next, Postgres,
Vercel o simili — e cultura in cui «perché hai scelto così» è la domanda
normale del colloquio. Sono l'obiettivo principale.

**Agenzie di prodotto e studi di design/sviluppo.** Vendono ai clienti proprio
la capacità di ragionare sul prodotto, non solo di eseguire. Un candidato che
arriva con 50 ADR è materiale che loro sanno usare.

**Startup in fase iniziale (seed / serie A).** Cercano qualcuno che sappia
fare più cose e non abbia bisogno di essere guidato. È esattamente il profilo
dimostrato.

### Compatibilità media

**Software house e consulenza (Reply, Accenture, Engineering, NTT Data…).**
Assumono molto e formano; il progetto aiuta a superare lo screening. Ma il
lavoro reale è spesso su stack diversi (Java, .NET) e su codice altrui: la
parte «ho progettato io» conta meno.

**Aziende non-tech con un team interno** (banche, assicurazioni, retail,
industria). Il progetto piace, ma i filtri sul titolo di studio sono più
rigidi e il processo più lento.

### Bassa compatibilità

**Big tech e aziende con colloqui su algoritmi e strutture dati.** Lì si passa
studiando esercizi, non costruendo prodotti. Il progetto non fa male, ma non
sposta niente.

**Ruoli puramente frontend su design system enormi**, dove serve profondità su
accessibilità, animazioni complesse e sistemi di componenti a più marchi. Qui
il progetto è largo ma non profondo su quell'asse.

### I ruoli da cercare, con questi nomi

- **Full-stack developer (TypeScript / React / Node)** — junior o mid
- **Frontend developer con sensibilità di prodotto**
- **Product engineer** — la definizione che descrive meglio quello che hai fatto
- **Web developer** in agenzia di prodotto

Da evitare, per ora: *software engineer* generico in contesti enterprise, e
qualunque annuncio che apra con «laurea in Informatica **richiesta**» senza
«o esperienza equivalente».

---

## 5. Come raccontarlo, in una riga

> Ho progettato e messo in produzione una piattaforma a due lati che mette in
> contatto artisti e chi li ingaggia. Sono ventitremila righe di TypeScript,
> cinquanta decisioni architetturali documentate con le alternative scartate, e
> una classificazione dei difetti che ho trovato usando il prodotto.

E subito dopo, prima che lo chiedano loro:

> Non ha ancora utenti reali. È il limite che conosco meglio, e la ragione per
> cui l'ultima settimana di lavoro non è stata su nuove funzioni.

Dire il limite per primo toglie all'altro l'unica domanda scomoda che avrebbe
fatto, e sposta la conversazione su come ci sei arrivato.

---

## 6. La lista di cose da fare, in ordine di resa

1. **`README.en.md` di una pagina** — mezz'ora, allarga di molto il pubblico
2. **`axe` in CI** — un'ora, trasforma una qualità raccontata in un numero
3. **Copertura dei test misurata e dichiarata** — `npm run test:coverage`
4. **Cinque artisti veri** — non è codice, ed è la cosa che vale di più
5. **Revisione legale** — prima di qualunque promozione al pubblico
