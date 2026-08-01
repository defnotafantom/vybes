import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = buildMetadata({
  title: "Informativa privacy",
  description: "Come Vybes tratta i dati personali degli utenti ai sensi del GDPR.",
  path: "/privacy",
});

/**
 * Informativa privacy.
 *
 * La versione precedente era uno scheletro che si dichiarava tale, e prometteva
 * una cancellazione dell'account che il codice non implementava. Ora la
 * funzione esiste e l'informativa la descrive: un documento che promette
 * comportamenti assenti è peggio della sua assenza, perché fa credere che una
 * garanzia ci sia.
 *
 * Restano da completare i dati del titolare, che non sono materia di codice.
 * Sono marcati in modo che si vedano.
 */

/** Data di ultimo aggiornamento, fissa: cambia quando cambia il testo. */
const AGGIORNATA = "1 agosto 2026";

const RESPONSABILI: [string, string, string][] = [
  ["Vercel Inc.", "Hosting dell'applicazione e rete di distribuzione", "Stati Uniti, con dati serviti dalla regione di Francoforte"],
  ["Neon Inc.", "Database PostgreSQL", "Unione Europea (Francoforte)"],
  ["Resend Inc.", "Invio delle email di servizio", "Stati Uniti"],
  ["Functional Software Inc. (Sentry)", "Raccolta degli errori applicativi", "Stati Uniti"],
  ["Upstash Inc.", "Limitazione delle richieste (Redis)", "Unione Europea"],
];

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-fluid-lg font-bold">{titolo}</h2>
      <div className="mt-3 space-y-3 text-fluid-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Privacy", path: "/privacy" }]} />

      <article className="max-w-3xl">
        <h1 className="text-fluid-2xl">Informativa privacy</h1>
        <p className="mt-3 text-fluid-xs text-ink-faint">Ultimo aggiornamento: {AGGIORNATA}</p>

        <p className="mt-6 rounded-xl border border-gold-500/40 bg-gold-500/[0.06] p-4 text-fluid-sm">
          <strong>Da completare prima dell&apos;apertura al pubblico.</strong> I
          riferimenti del titolare del trattamento vanno inseriti con dati reali
          e il testo va rivisto da un legale. Tutto il resto descrive il
          funzionamento effettivo della piattaforma.
        </p>

        <Sezione titolo="Titolare del trattamento">
          <p>
            <span className="rounded bg-gold-500/[0.12] px-1.5 py-0.5 text-gold-300">
              [Nome e cognome o ragione sociale, indirizzo, partita IVA o codice fiscale]
            </span>
          </p>
          <p>
            Per esercitare i tuoi diritti o per qualsiasi domanda sul
            trattamento:{" "}
            <span className="rounded bg-gold-500/[0.12] px-1.5 py-0.5 text-gold-300">
              [indirizzo email di contatto]
            </span>
          </p>
        </Sezione>

        <Sezione titolo="Quali dati raccogliamo">
          <p>
            <strong className="text-ink">Dati che fornisci tu.</strong> Indirizzo
            email, password, nome pubblico, città, discipline, biografia, link ai
            tuoi profili esterni, immagini di profilo e di copertina, contenuti
            del portfolio, post, commenti, messaggi, candidature agli ingaggi ed
            eventi che pubblichi.
          </p>
          <p>
            <strong className="text-ink">Dati generati dall&apos;uso.</strong>{" "}
            Livello, esperienza e reputazione, calcolati dalla tua attività sulla
            piattaforma.
          </p>
          <p>
            <strong className="text-ink">Dati tecnici.</strong> Indirizzo IP e
            informazioni sul browser, trattati per la sicurezza e per limitare le
            richieste abusive. In caso di errore dell&apos;applicazione, il
            dettaglio tecnico viene inviato al servizio di monitoraggio.
          </p>
          <p>
            La password non viene mai conservata in chiaro: ne viene salvata una
            trasformazione irreversibile (bcrypt). Nessuno, noi compresi, può
            risalire alla password originale.
          </p>
        </Sezione>

        <Sezione titolo="Perché li trattiamo, e con quale base giuridica">
          <p>
            <strong className="text-ink">Per farti usare il servizio</strong> —
            profilo, portfolio, candidature, messaggi: esecuzione del contratto
            (art. 6.1.b GDPR).
          </p>
          <p>
            <strong className="text-ink">Per la sicurezza</strong> —
            autenticazione, limitazione delle richieste, rilevamento degli
            errori: legittimo interesse (art. 6.1.f).
          </p>
          <p>
            <strong className="text-ink">Per le email di servizio</strong> —
            verifica dell&apos;indirizzo, reimpostazione della password:
            esecuzione del contratto.
          </p>
          <p>
            Non inviamo comunicazioni commerciali e non profiliamo gli utenti a
            fini pubblicitari.
          </p>
        </Sezione>

        <Sezione titolo="Cosa è pubblico">
          <p>
            Se il tuo profilo è impostato come pubblico, nome, città, discipline,
            biografia, portfolio ed eventi che pubblichi sono visibili a chiunque
            e indicizzabili dai motori di ricerca. È il funzionamento previsto:
            la piattaforma serve a farti trovare.
          </p>
          <p>
            Non sono mai pubblici: l&apos;indirizzo email, i messaggi privati e
            le candidature agli ingaggi.
          </p>
          <p>
            Puoi rendere il profilo privato in qualsiasi momento dalle
            impostazioni. Le pagine già visitate dai motori di ricerca possono
            restare nella loro copia cache per qualche tempo: è un processo che
            dipende da loro e non da noi.
          </p>
        </Sezione>

        <Sezione titolo="Chi altro tratta i dati">
          <p>
            Ci appoggiamo a fornitori che agiscono come responsabili del
            trattamento, ciascuno per la propria parte:
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-fluid-xs">
              <thead>
                <tr className="border-b text-left text-ink">
                  <th className="py-2 pr-4 font-semibold">Fornitore</th>
                  <th className="py-2 pr-4 font-semibold">Cosa fa</th>
                  <th className="py-2 font-semibold">Dove risiedono i dati</th>
                </tr>
              </thead>
              <tbody>
                {RESPONSABILI.map(([nome, ruolo, dove]) => (
                  <tr key={nome} className="border-b">
                    <td className="py-2 pr-4 align-top text-ink">{nome}</td>
                    <td className="py-2 pr-4 align-top">{ruolo}</td>
                    <td className="py-2 align-top">{dove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            I trasferimenti verso gli Stati Uniti avvengono sulla base delle
            clausole contrattuali standard della Commissione europea e, dove
            applicabile, dell&apos;adesione dei fornitori al Data Privacy
            Framework.
          </p>
          <p>
            Le mappe usano i riquadri di OpenStreetMap: aprendo una pagina con
            una mappa, il tuo browser contatta direttamente i loro server, che
            vedono il tuo indirizzo IP.
          </p>
        </Sezione>

        <Sezione titolo="Cookie e misurazione">
          <p>
            Usiamo un cookie tecnico per tenerti autenticato e uno per ricordare
            la preferenza di tema. Non richiedono consenso perché senza di essi
            il servizio non funziona.
          </p>
          <p>
            Le statistiche di traffico sono raccolte in forma aggregata, senza
            cookie né identificatori persistenti: non permettono di risalire a
            una persona.
          </p>
        </Sezione>

        <Sezione titolo="Per quanto tempo li conserviamo">
          <p>
            I dati del profilo restano finché l&apos;account esiste. Alla
            cancellazione vengono rimossi immediatamente e definitivamente,
            insieme a portfolio, post, commenti, candidature, eventi pubblicati e
            messaggi inviati.
          </p>
          <p>
            I token di verifica e di reimpostazione password scadono entro poche
            ore e vengono eliminati. I registri tecnici degli errori sono
            conservati dal fornitore di monitoraggio per un periodo limitato.
          </p>
          <p>
            Non conserviamo copie dopo la cancellazione: non esiste un cestino e
            non possiamo recuperare un account eliminato.
          </p>
        </Sezione>

        <Sezione titolo="I tuoi diritti">
          <p>
            Hai diritto di accedere ai tuoi dati, correggerli, cancellarli,
            limitarne il trattamento, opporti e riceverne una copia portabile.
            Due di questi puoi esercitarli da solo, subito, senza chiedere
            permesso a nessuno:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Copia dei tuoi dati:</strong> dal{" "}
              <Link href="/dashboard/profilo" className="link-underline">
                tuo profilo
              </Link>
              , pulsante «Esporta i miei dati». Ottieni un file JSON, formato
              leggibile anche da altri programmi.
            </li>
            <li>
              <strong className="text-ink">Cancellazione:</strong> dallo stesso
              punto, in fondo alla pagina. È immediata e definitiva.
            </li>
          </ul>
          <p className="mt-3">
            Per gli altri diritti scrivici all&apos;indirizzo indicato sopra.
            Rispondiamo entro trenta giorni.
          </p>
          <p>
            Se ritieni che il trattamento violi il regolamento, puoi proporre
            reclamo al Garante per la protezione dei dati personali
            (garanteprivacy.it).
          </p>
        </Sezione>

        <Sezione titolo="Minori">
          <p>
            {SITE.name} non è rivolto a minori di sedici anni. Se veniamo a
            conoscenza di un account intestato a un minore di quell&apos;età, lo
            eliminiamo.
          </p>
        </Sezione>

        <Sezione titolo="Modifiche">
          <p>
            Se cambiamo questa informativa aggiorniamo la data in alto. Per
            modifiche sostanziali avvisiamo per email gli utenti registrati.
          </p>
        </Sezione>
      </article>
    </div>
  );
}
