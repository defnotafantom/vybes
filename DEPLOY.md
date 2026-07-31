# Deploy su Vercel + Neon

## 0. Ruota i secret (da fare per primo)

Le credenziali attuali sono state condivise in chiaro e vanno considerate compromesse.

| Secret | Dove | Cosa fare |
|---|---|---|
| Password Neon | Neon → Project → Roles → `neondb_owner` | Reset password, poi aggiorna `DATABASE_URL` e `DIRECT_URL` |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob → Tokens | Revoca il token e generane uno nuovo |
| `AUTH_SECRET` | — | `openssl rand -base64 32`. Ruotarlo invalida tutte le sessioni attive: gli utenti rifanno login, ed è esattamente quello che serve |
| Token Mapillary | Mapillary dashboard | Rigenera e limita al dominio `vybeshub.art` |

## 1. Variabili d'ambiente su Vercel

**Da aggiungere**

| Nome | Ambiente | Valore |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | All | `https://vybeshub.art` |
| `AUTH_SECRET` | All | nuovo secret generato |
| `AUTH_TRUST_HOST` | All | `true` |
| `DIRECT_URL` | All | URL Neon **senza** `-pooler` |
| `UPLOAD_DRIVER` | All | `vercel-blob` |
| `SITE_ENV` | Production | `production` |

**Da rimuovere**

| Nome | Perché |
|---|---|
| `VITE_API_URL` | Prefisso Vite: Next non lo espone al client. Residuo di un'app precedente |
| `BLOB1_READ_WRITE_TOKEN` | Duplicato identico di `BLOB_READ_WRITE_TOKEN` |
| `NEXTAUTH_SECRET` | Sostituito da `AUTH_SECRET` (Auth.js v5) |
| `NEXTAUTH_URL` | Superfluo con `AUTH_TRUST_HOST`, e su Preview punta al dominio di produzione |
| `NEXT_PUBLIC_MAPILLARY_TOKEN` | Solo se non usi Mapillary: la mappa gira su tile OpenStreetMap |

**Da tenere**: `DATABASE_URL` (pooler) e `BLOB_READ_WRITE_TOKEN`, entrambi con i valori nuovi.

`SITE_ENV=production` solo su Production è voluto: senza quella variabile `robots.ts`
serve `Disallow: /`, così i deploy di preview non finiscono nell'indice a fare
concorrenza al dominio vero.

## 2. Database

Lo schema è PostgreSQL e usa migrazioni versionate, non `db push`.

```bash
# la prima volta, in locale, con DIRECT_URL che punta a Neon
npx prisma migrate dev --name init
git add prisma/migrations && git commit -m "migrazione iniziale"
```

Lo script `build` esegue `prisma migrate deploy` prima di `next build`: ogni deploy
applica da solo le migrazioni pendenti.

Il seed va lanciato una volta sola, a mano:

```bash
npm run db:seed
```

Popola 20 città e 8 quest, che sono dati di configurazione, non demo. Artisti ed
eventi fittizi servono solo a vedere il sito pieno: in produzione togli quei blocchi
da `prisma/seed.ts` prima di lanciarlo, oppure cancellali dopo.

## 3. Dominio

Punta `vybeshub.art` al progetto Vercel e scegli **una** forma canonica (con o senza
`www`), impostando l'altra come redirect 301. Due domini che servono lo stesso
contenuto dividono i segnali di ranking.

## 4. Verifiche dopo il primo deploy

1. `https://vybeshub.art/robots.txt` deve contenere `Allow: /`. Se vedi `Disallow: /`,
   manca `SITE_ENV=production`.
2. `https://vybeshub.art/sitemap.xml` deve elencare cinque sotto-sitemap con URL su
   `vybeshub.art`, non su `*.vercel.app`. Se vedi il dominio Vercel, manca
   `NEXT_PUBLIC_SITE_URL`.
3. Search Console: verifica la proprietà e invia la sitemap.
4. Rich Results Test su una pagina `/eventi/...` e una `/artisti/...`.
5. Carica un file dalla dashboard: l'URL restituito deve essere
   `*.public.blob.vercel-storage.com`. Se è `/uploads/...`, `UPLOAD_DRIVER` non è
   impostato e il file sparirà al prossimo deploy.
