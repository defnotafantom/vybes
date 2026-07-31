# Da qui alla messa online — lista completa

Sei fasi in ordine. Ognuna dà per fatta la precedente.
Le fasi 0-4 sono bloccanti: senza, il sito non funziona.
La fase 5 è quella che decide se il progetto avrà traffico.

Tempo: **circa 2 ore e mezza** fino a "online e verificato", esclusa la fase 5.

---

# FASE 0 — Ruota le credenziali · 15 min · BLOCCANTE

Le credenziali attuali sono state incollate in chiaro in chat. Vanno
considerate pubbliche. Con la stringa Neon si legge e si scrive tutto il
database; con `AUTH_SECRET` si firma un cookie di sessione valido per qualsiasi
account, incluso il tuo.

## 0.1 Password Neon

1. [console.neon.tech](https://console.neon.tech) → il tuo progetto
2. **Roles** → riga `neondb_owner` → **Reset password**
3. Copia la nuova password: **appare una volta sola**
4. **Connection Details** → ti servono **due** stringhe:

   | Variabile | Come ottenerla |
   |---|---|
   | `DATABASE_URL` | spunta **Pooled connection** attiva → l'host contiene `-pooler` |
   | `DIRECT_URL` | togli la spunta → l'host **non** contiene `-pooler` |

   ```
   DATABASE_URL=postgresql://neondb_owner:NUOVA@ep-sweet-cloud-agamab83-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
   DIRECT_URL=postgresql://neondb_owner:NUOVA@ep-sweet-cloud-agamab83.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   L'unica differenza è `-pooler`. Se le inverti, le migrazioni si bloccano
   senza un errore comprensibile.

## 0.2 Token Vercel Blob

Vercel → progetto → **Storage** → il tuo Blob store → **Tokens** → revoca
quello vecchio, **Create token** read/write, copia il valore.

## 0.3 AUTH_SECRET

```bash
openssl rand -base64 32
```

PowerShell, se non hai openssl:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

## 0.4 Token Mapillary

Solo se lo usi. La mappa gira su OpenStreetMap, quindi puoi anche cancellare la
variabile alla fase 3.

---

# FASE 1 — Fallo girare in locale · 30 min · BLOCCANTE

Prima di deployare devi vederlo funzionare sulla tua macchina, perché la prima
migrazione va generata qui e committata.

## 1.1 Installa

```bash
cd vybes
npm install
npx playwright install chromium    # solo se vuoi lanciare i test e2e
```

## 1.2 Configura l'ambiente locale

```bash
cp .env.local.example .env.local
```

Compila `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` con i valori della fase 0.

> Consiglio: su Neon crea un **branch** di sviluppo (Branches → Create branch) e
> usa quelle stringhe qui. Provi le migrazioni senza toccare la produzione, e il
> branch si resetta in un click.

## 1.3 Genera la prima migrazione

```bash
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "migrazione iniziale"
```

**Il commit non è opzionale.** Lo script `build` esegue `prisma migrate deploy`,
che applica le migrazioni presenti nel repo. Se la cartella non è committata, il
deploy non crea nessuna tabella e ogni pagina va in errore.

## 1.4 Popola i dati di base

```bash
npm run db:seed
```

Inserisce 20 città e 8 quest: sono **dati di configurazione**, senza il sito non
funziona. Aggiunge anche 6 artisti e 6 ingaggi fittizi con email `@vybes.test`.
Per saltarli, commenta i blocchi `DEMO_ARTISTS` e `DEMO_EVENTS` in
`prisma/seed.ts` prima di lanciare.

## 1.5 Avvia e controlla

```bash
npm run dev
```

| URL | Cosa deve succedere |
|---|---|
| `localhost:3000` | landing con artisti e ingaggi in evidenza |
| `localhost:3000/citta/milano` | pagina città con profili e ingaggi |
| `localhost:3000/api/health` | `"status": "healthy"`, `"database": "connected"` |
| `localhost:3000/sitemap.xml` | indice con cinque sotto-sitemap |

Accedi con `chiara-bellandi@vybes.test` / `Password123`, pubblica un post e
carica una foto profilo.

## 1.6 Lancia i test

```bash
npm test          # 81 unitari, ~2 secondi
npm run test:e2e  # 20 end-to-end, richiede il database popolato
```

Se qualcosa è rosso, fermati: è più facile capire un test rotto in locale che un
500 in produzione.

## 1.7 Crea il tuo account da amministratore

```bash
npx tsx scripts/crea-utente.ts tua@email.it "Il Tuo Nome" RECRUITER
npx tsx scripts/assegna-ruolo-admin.ts tua@email.it SUPERADMIN
```

Il primo superadmin va creato per forza da riga di comando: dall'interfaccia
servirebbe già esserlo per promuovere qualcuno.

---

# FASE 2 — Servizi esterni · 45 min · BLOCCANTE

## 2.1 Resend, per le email

Senza questo passo la registrazione funziona ma **nessuno riceve l'email di
conferma**. Il codice se ne accorge: se `RESEND_API_KEY` manca, gli account
nascono già verificati e l'email finisce nei log invece che nella casella. Va
bene per provare, non per aprire al pubblico.

1. Registrati su [resend.com](https://resend.com) — 3.000 email al mese gratis
2. **Domains** → **Add Domain** → `vybeshub.art`
3. Resend mostra 3-4 record DNS (SPF, DKIM, a volte DMARC). Vanno inseriti dove
   gestisci il DNS:
   - dominio su Vercel: **Domains** → `vybeshub.art` → tab **DNS**
   - altrimenti nel pannello del registrar

   Copia **esattamente** nome, tipo e valore. Attenzione al campo nome: alcuni
   registrar vogliono `resend._domainkey`, altri
   `resend._domainkey.vybeshub.art`. Sbagliato quello, la verifica non passa.
4. Torna su Resend → **Verify**. Da pochi minuti a qualche ora.
5. **API Keys** → **Create API Key**, permesso *Sending access*
6. Mittente: `no-reply@vybeshub.art`. Non serve una casella vera, basta il
   dominio verificato.

> Per un test immediato senza aspettare il DNS, Resend consente di inviare da
> `onboarding@resend.dev` **verso il tuo indirizzo di registrazione**.

## 2.2 Upstash Redis — facoltativo, 5 min

Senza, il rate limiting vale per singola istanza: con N istanze attive il limite
effettivo è N volte quello dichiarato. Basta per iniziare, non per difendersi.

1. [console.upstash.com](https://console.upstash.com) → **Create Database** →
   regione europea, tipo **Regional**
2. Nella scheda del database, sezione **REST API**, copia `UPSTASH_REDIS_REST_URL`
   e `UPSTASH_REDIS_REST_TOKEN`
3. Il piano gratuito copre 10.000 comandi al giorno: sufficiente finché il
   traffico non cresce davvero

Verifichi che sia attivo da `/api/health`: `"rateLimitBackend": "redis"`.

## 2.3 Google OAuth — facoltativo, 10 min

Riduce l'attrito all'iscrizione e l'indirizzo arriva già verificato. Se non lo
configuri, il bottone semplicemente non compare.

1. [console.cloud.google.com](https://console.cloud.google.com) → nuovo progetto
2. **API e servizi** → **Schermata consenso OAuth** → tipo **Esterno**
3. **Credenziali** → **Crea credenziali** → **ID client OAuth** → *Applicazione web*
4. **URI di reindirizzamento autorizzati**, entrambi:
   ```
   https://vybeshub.art/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
5. Client ID e Client Secret → `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`

---

# FASE 3 — Deploy · 30 min · BLOCCANTE

## 3.1 Variabili su Vercel

**Settings → Environment Variables.**

### Aggiungi

| Nome | Ambiente | Valore |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | All | `https://vybeshub.art` |
| `AUTH_SECRET` | All | fase 0.3 |
| `AUTH_TRUST_HOST` | All | `true` |
| `DIRECT_URL` | All | stringa Neon **senza** `-pooler` |
| `UPLOAD_DRIVER` | All | `vercel-blob` |
| `RESEND_API_KEY` | All | fase 2.1 |
| `EMAIL_FROM` | All | `Vybes <no-reply@vybeshub.art>` |
| `SITE_ENV` | **solo Production** | `production` |
| `UPSTASH_REDIS_REST_URL` | All | fase 2.2, se fatta |
| `UPSTASH_REDIS_REST_TOKEN` | All | fase 2.2, se fatta |
| `AUTH_GOOGLE_ID` | All | fase 2.3, se fatta |
| `AUTH_GOOGLE_SECRET` | All | fase 2.3, se fatta |

### Aggiorna

| Nome | Valore |
|---|---|
| `DATABASE_URL` | stringa Neon **con** `-pooler`, password nuova |
| `BLOB_READ_WRITE_TOKEN` | token nuovo, fase 0.2 |

### Elimina

| Nome | Motivo |
|---|---|
| `VITE_API_URL` | prefisso Vite: Next non lo espone al client, non fa niente |
| `BLOB1_READ_WRITE_TOKEN` | duplicato identico dell'altro |
| `NEXTAUTH_SECRET` | sostituito da `AUTH_SECRET` (Auth.js v5) |
| `NEXTAUTH_URL` | superfluo con `AUTH_TRUST_HOST`, e su Preview punta al dominio di produzione |
| `NEXT_PUBLIC_MAPILLARY_TOKEN` | se non usi Mapillary |

`SITE_ENV` **solo su Production** è voluto: senza, `robots.ts` serve
`Disallow: /`, così i deploy di preview restano fuori dall'indice e non fanno
concorrenza al dominio vero.

## 3.2 Dominio

Vercel → **Settings → Domains**:
1. aggiungi `vybeshub.art`
2. aggiungi `www.vybeshub.art` come **redirect** verso quello senza www (o
   l'inverso — conta scegliere, non quale)

Due domini che servono lo stesso contenuto dividono i segnali di ranking.

## 3.3 Deploy

```bash
git push
```

Se hai cambiato le variabili senza fare push: **Deployments → ⋯ → Redeploy**.
Le variabili si applicano solo ai deploy nuovi.

## 3.4 Seed di produzione

Una volta sola, con `.env.local` puntato al database di **produzione**:

```bash
npm run db:seed
```

Commenta `DEMO_ARTISTS` e `DEMO_EVENTS` se non vuoi i profili fittizi online.

---

# FASE 4 — Verifica · 15 min · BLOCCANTE

## 4.1 Health check — fallo per primo

```
https://vybeshub.art/api/health
```

```json
{
  "status": "healthy",
  "database": "connected",
  "config": {
    "email": true,
    "blobStorage": true,
    "googleOAuth": true,
    "rateLimitBackend": "redis",
    "canonicalUrl": "https://vybeshub.art",
    "envValid": true,
    "envWarnings": []
  }
}
```

| Se vedi | Significa |
|---|---|
| `"database": "error"` | `DATABASE_URL` sbagliata, o migrazioni non applicate |
| `"email": false` | manca `RESEND_API_KEY` o `EMAIL_FROM` |
| `"blobStorage": false` | manca `BLOB_READ_WRITE_TOKEN` |
| `"canonicalUrl": null` | **manca `NEXT_PUBLIC_SITE_URL`** — l'errore più costoso |
| `envWarnings` non vuoto | leggi il testo, dice cosa non torna |

## 4.2 robots.txt

`https://vybeshub.art/robots.txt` → deve contenere `Allow: /`.
Se dice `Disallow: /`, manca `SITE_ENV=production`.

## 4.3 Sitemap

`https://vybeshub.art/sitemap.xml` → cinque sotto-sitemap con URL su
`vybeshub.art`. Se vedi `vybes-qualcosa.vercel.app`, manca
`NEXT_PUBLIC_SITE_URL` e Google indicizzerebbe il dominio sbagliato.

## 4.4 Registrazione

Crea un account con una tua email vera: deve arrivare la conferma. Se non
arriva, Resend → **Logs** mostra ogni tentativo con il motivo del fallimento.

## 4.5 Upload

Dalla dashboard carica una foto profilo, poi tasto destro sull'immagine: l'URL
deve essere `https://xxx.public.blob.vercel-storage.com/...`. Se è
`/uploads/...`, manca `UPLOAD_DRIVER=vercel-blob` e il file sparirà al prossimo
deploy.

## 4.6 Dati strutturati

[Rich Results Test](https://search.google.com/test/rich-results) su:
- una pagina `/eventi/...` → deve rilevare **Event**
- una pagina `/artisti/...` → deve rilevare **Person** o **MusicGroup**

---

# FASE 5 — Apertura e crescita

## 5.1 Google Search Console · 20 min

1. [search.google.com/search-console](https://search.google.com/search-console)
   → **Aggiungi proprietà** → tipo **Dominio** → `vybeshub.art`
2. Inserisci il record TXT nel DNS (stesso posto della fase 2.1)
3. **Sitemap** → `sitemap.xml` → Invia
4. **Controllo URL** sulla home → **Richiedi indicizzazione**

Non aspettarti risultati prima di 2-4 settimane. E senza la 5.3, non
aspettarli affatto.

## 5.2 Privacy e termini · da delegare

`/privacy` e `/termini` sono bozze che coprono i punti giusti ma **non sono
testi legali validi**. Trattando dati personali di artisti e organizzatori in UE
servono informativa GDPR completa, cookie policy e termini che chiariscano che
Vybes non è parte del contratto artista-organizzatore. Un avvocato specializzato
in digitale le sistema in poche ore.

## 5.3 Riempi il sito — il punto che conta davvero

Il codice SEO è pronto, ma **su un database vuoto non produce niente**. Ci sono
circa 200 pagine di directory locale: con sei artisti demo quasi tutte dicono
"nessun profilo trovato". Google le classifica come thin content e dopo un paio
di visite smette di tornare, anche sulle pagine buone.

Il codice si difende: le pagine senza contenuto restano fuori dalla sitemap e in
`noindex` (soglia in `MIN_ITEMS_FOR_INDEX`, `src/lib/constants.ts`). Ma questo
evita il danno, non crea il traffico.

**Concentrati, non spargere.**

1. Scegli **una** città — quella dove hai più contatti veri, non la più grande
2. Portaci **20-30 artisti reali**, con foto, bio e almeno un elemento di
   portfolio. Trenta profili pieni in una città posizionano; trecento vuoti
   sparsi in venti città no
3. Pubblica **5-10 ingaggi veri** nella stessa città. Anche piccoli: sono le
   pagine con i dati strutturati Event, quelle che possono finire nei rich result
4. Solo quando quella città gira, apri la seconda

**Come trovare i primi trenta**: non arrivano da soli. Contattali uno per uno —
locali che conosci, musicisti su Instagram, scuole di danza, collettivi. Offri
di **compilare tu il profilo al posto loro**: la frizione dell'iscrizione è
l'ostacolo vero, non la mancanza di interesse. Con
`npx tsx scripts/crea-utente.ts` crei l'account e mandi le credenziali già
pronte.

---

# Checklist

```
FASE 0 — Credenziali
  [ ] Password Neon resettata, DATABASE_URL e DIRECT_URL copiate
  [ ] Token Blob revocato e rigenerato
  [ ] AUTH_SECRET generato
  [ ] Token Mapillary rigenerato o rimosso

FASE 1 — Locale
  [ ] npm install
  [ ] .env.local compilato
  [ ] prisma migrate dev --name init
  [ ] cartella prisma/migrations committata
  [ ] npm run db:seed
  [ ] /api/health risponde healthy
  [ ] npm test verde
  [ ] account superadmin creato

FASE 2 — Servizi
  [ ] Dominio Resend verificato
  [ ] API key Resend copiata
  [ ] Upstash Redis configurato (facoltativo)
  [ ] Google OAuth configurato (facoltativo)

FASE 3 — Deploy
  [ ] Variabili aggiunte su Vercel
  [ ] Variabili obsolete eliminate
  [ ] Dominio e redirect www configurati
  [ ] Deploy completato
  [ ] Seed di produzione lanciato

FASE 4 — Verifica
  [ ] /api/health tutto verde
  [ ] robots.txt dice Allow: /
  [ ] sitemap.xml usa il dominio vero
  [ ] email di conferma ricevuta
  [ ] upload finisce su blob.vercel-storage.com
  [ ] Rich Results Test rileva Event e Person

FASE 5 — Crescita
  [ ] Search Console verificata e sitemap inviata
  [ ] Privacy e termini validati da un legale
  [ ] Prima città scelta
  [ ] 20-30 artisti reali caricati
  [ ] 5-10 ingaggi reali pubblicati
```

---

# Se qualcosa va storto

| Sintomo | Prima cosa da guardare |
|---|---|
| Ogni pagina dà 500 | `/api/health` → `database` |
| "Table does not exist" | migrazioni non committate (fase 1.3) |
| Le email non arrivano | Resend → Logs; poi `"email"` in `/api/health` |
| Le foto spariscono dopo un deploy | `UPLOAD_DRIVER` non è `vercel-blob` |
| Google indicizza `*.vercel.app` | manca `NEXT_PUBLIC_SITE_URL` |
| Il sito non viene indicizzato | `robots.txt` → manca `SITE_ENV=production` |
| Migrazioni bloccate senza errore | stai usando l'URL pooled al posto di `DIRECT_URL` |
| Login impossibile in produzione | verifica email attiva ma Resend non configurata |
