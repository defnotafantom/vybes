# Vybes

**Piattaforma per artisti e organizzatori di eventi.**

Vybes nasce dall’idea di rendere più semplice trovare persone creative, mostrare i loro lavori e proporre una collaborazione. Un artista può creare un profilo e un portfolio; un organizzatore può pubblicare un’opportunità e ricevere candidature.

**Stato:** progetto personale in sviluppo. Il codice è disponibile per essere esaminato e provato in un ambiente di sviluppo; questo non equivale a un servizio commerciale completato.

[Presentazione nel portfolio](https://cphr.it/lavori/vybeshub) · [Profilo di Daniele](https://github.com/defnotafantom)

## Contesto e contributo

Progetto di Daniele Bucca, sviluppato con l’assistenza di Claude, Codex e ChatGPT. Il contributo riguarda la definizione del prodotto, i requisiti, le scelte di interfaccia e l’organizzazione del lavoro. Implementazione e verifiche sono assistite dall’IA; la padronanza delle tecnologie impiegate è in consolidamento.

## Cosa contiene

- Profili per artisti, portfolio e ricerca per città e disciplina.
- Opportunità pubblicate dagli organizzatori e gestione delle candidature.
- Account, autenticazione, ruoli, messaggi e notifiche.
- Funzioni per esportare i dati dell’account e richiederne la cancellazione.
- Pagine pubbliche con metadata, sitemap e dati strutturati.
- Test unitari, controlli sui tipi e pipeline GitHub Actions.

## Tecnologie

| Ambito | Tecnologie presenti |
| --- | --- |
| Interfaccia e server | TypeScript, React, Next.js App Router |
| Dati | PostgreSQL, Prisma e migrazioni versionate |
| Accesso e validazione | Auth.js, Zod |
| File | Vercel Blob; driver locale per lo sviluppo |
| Qualità | Vitest, Playwright, GitHub Actions |
| Diagnostica | Sentry, endpoint di salute |

## Dove leggere il codice

| Percorso | Contenuto |
| --- | --- |
| [`src/app`](./src/app) | Pagine e API |
| [`src/components`](./src/components) | Componenti dell’interfaccia |
| [`src/lib`](./src/lib) | Autenticazione, permessi, validazione e logica condivisa |
| [`prisma/schema.prisma`](./prisma/schema.prisma) | Modello dei dati |
| [`prisma/migrations`](./prisma/migrations) | Evoluzione dello schema |
| [`tests/unit`](./tests/unit) | Test della logica |
| [`tests/e2e`](./tests/e2e) | Flussi di navigazione verificati con Playwright |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | Controlli della pipeline |

## Avvio in locale

Servono Node.js 22.12 o successivo e un database PostgreSQL dedicato allo sviluppo.

```bash
npm ci
cp .env.local.example .env
```

Configura `DATABASE_URL` e `DIRECT_URL` verso quel database, `AUTH_SECRET` con un valore locale e `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Per i caricamenti di prova usa `UPLOAD_DRIVER=local`. Le altre integrazioni sono documentate nel file di esempio. Prima del rilascio configura anche i riferimenti `TITOLARE_*` sul server: i dati anagrafici e fiscali non sono inseriti nel codice della repository.

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Il seed crea contenuti e account dimostrativi con indirizzi `.test`. Migrazioni, seed e test end-to-end devono usare un database di sviluppo o di test, separato dai dati degli utenti.

## Verifiche riproducibili

```bash
npm run typecheck
npm run lint
npm run verify:seo
npm run verify:css
npm run verify:shader
npm test
npm audit
```

Per gli end-to-end configura un `E2E_DATABASE_URL` dedicato, poi:

```bash
npm run test:e2e
```

[`scripts/verifica-db-test.mjs`](./scripts/verifica-db-test.mjs) controlla la configurazione prima di eseguire i test. `npm run build` applica anche le migrazioni: eseguilo solo sull’ambiente che intendi aggiornare.

## Limiti e lavoro aperto

Il rilascio richiede una verifica dei flussi con database e servizi configurati, delle procedure di ripristino e dei contenuti di privacy. Le funzioni email, storage e monitoraggio dipendono dalle rispettive configurazioni. Un test unitario superato non dimostra da solo che tutte queste integrazioni siano funzionanti.

I documenti precedenti presenti nella repository conservano analisi e decisioni storiche. Per l’avvio e lo stato dichiarato, parti da questo README e controlla la revisione del codice che stai usando.

## Pubblicazione

I deploy automatici del ramo `main` sono sospesi finché il rilascio non viene collaudato e preparato sull’ambiente operativo. Un aggiornamento di questa repository non applica migrazioni al database online. Prima del rilascio occorre configurare i riferimenti `TITOLARE_*` sul server, verificare le integrazioni e predisporre il ripristino dei dati.
