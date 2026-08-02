import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE } from "@/lib/constants";
import { MOTIVI, MOTIVI_VALIDI } from "@/lib/segnalazioni";
import { TITOLARE, titolareCompleto } from "@/lib/titolare";

export const metadata: Metadata = buildMetadata({
  title: "Termini di servizio",
  description: "Le condizioni d'uso della piattaforma Vybes per artisti e organizzatori.",
  path: "/termini",
});

/**
 * Termini di servizio.
 *
 * L'elenco di ciò che non si può pubblicare è generato dagli stessi motivi di
 * segnalazione usati dal modulo e dalla coda di moderazione. Non è un vezzo:
 * termini e moderazione che divergono sono il modo più semplice per trovarsi a
 * rimuovere contenuti sulla base di una regola che da nessuna parte è scritta,
 * oppure a non poter rimuovere qualcosa che i termini vietano.
 *
 * Restano da completare i dati del titolare e il foro competente, che non sono
 * materia di codice. Sono marcati in modo che si vedano.
 */

const AGGIORNATI = "1 agosto 2026";

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-fluid-lg font-bold">{titolo}</h2>
      <div className="mt-3 space-y-3 text-fluid-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

const Manca = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-gold-500/[0.12] px-1.5 py-0.5 text-gold-300">[{children}]</span>
);

export default function TerminiPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Termini", path: "/termini" }]} />

      <article className="max-w-3xl">
        <h1 className="text-fluid-2xl">Termini di servizio</h1>
        <p className="mt-3 text-fluid-xs text-ink-faint">In vigore dal {AGGIORNATI}</p>

        {/* Compare e sparisce da solo secondo `src/lib/titolare.ts`: vedi la
            nota in quel file. */}
        {!titolareCompleto() && (
          <p className="mt-6 rounded-xl border border-gold-500/40 bg-gold-500/[0.06] p-4 text-fluid-sm">
            <strong>Da completare prima dell&apos;apertura al pubblico.</strong>{" "}
            I riferimenti del gestore e il foro competente vanno inseriti con
            dati reali, e il testo va rivisto da un legale. Tutto il resto
            descrive il funzionamento effettivo della piattaforma.
          </p>
        )}

        <Sezione titolo="Chi gestisce Vybes">
          {titolareCompleto() ? (
            <>
              <p>
                {TITOLARE.nome}
                <br />
                {TITOLARE.indirizzo}
                <br />
                {TITOLARE.fiscale}
              </p>
              <p>
                Contatto:{" "}
                <a href={`mailto:${TITOLARE.email}`} className="link-underline">
                  {TITOLARE.email}
                </a>
              </p>
            </>
          ) : (
            <p>
              <Manca>
                Da compilare in src/lib/titolare.ts: nome o ragione sociale,
                indirizzo, partita IVA o codice fiscale, email
              </Manca>
            </p>
          )}
        </Sezione>

        <Sezione titolo="Cosa è Vybes, e cosa non è">
          <p>
            {SITE.name} mette in contatto artisti e chi cerca di ingaggiarli.
            Fornisce lo spazio in cui pubblicare un profilo, un portfolio e degli
            annunci, e gli strumenti per scriversi.
          </p>
          <p>
            <strong className="text-ink">
              Non è parte dell&apos;accordo fra artista e organizzatore.
            </strong>{" "}
            Compensi, orari, condizioni, fatturazione, adempimenti fiscali e
            previdenziali riguardano solo le due parti. {SITE.name} non incassa,
            non trattiene commissioni, non garantisce che un ingaggio si
            concluda né che venga pagato, e non media le controversie.
          </p>
          <p>
            Questo è il punto più importante di tutto il documento, ed è il
            motivo per cui il compenso viene mostrato in chiaro negli annunci:
            perché le due parti si accordino con i dati davanti, non attraverso
            un intermediario che non c&apos;è.
          </p>
        </Sezione>

        <Sezione titolo="Chi può iscriversi">
          <p>
            Serve avere almeno sedici anni e un indirizzo email valido, che va
            confermato: finché non lo è, il profilo non compare negli elenchi
            pubblici e non viene indicizzato.
          </p>
          <p>
            Un account per persona o gruppo. Gli account creati per aggirare una
            sospensione vengono chiusi.
          </p>
        </Sezione>

        <Sezione titolo="Cosa pubblichi resta tuo">
          <p>
            Testi, immagini, audio e video che carichi restano di chi li ha
            fatti. Iscrivendoti concedi a {SITE.name} solo quel tanto che serve a
            farli funzionare: mostrarli sulla piattaforma, ridimensionarli per il
            web, includerli nelle anteprime di condivisione e permettere ai
            motori di ricerca di indicizzarli se il tuo profilo è pubblico.
          </p>
          <p>
            Nessun altro uso. Non rivendiamo i contenuti, non li usiamo in
            pubblicità, non li cediamo a terzi. La licenza finisce quando
            rimuovi il contenuto o cancelli l&apos;account.
          </p>
          <p>
            Carichi solo materiale di cui hai i diritti. Se in una foto o in una
            registrazione compaiono altre persone, devi averne il consenso.
          </p>
        </Sezione>

        <Sezione titolo="Cosa non si può pubblicare">
          <p>
            L&apos;elenco che segue è lo stesso su cui si basano le segnalazioni
            e le decisioni di moderazione:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {MOTIVI_VALIDI.filter((m) => m !== "ALTRO").map((m) => (
              <li key={m}>
                <strong className="text-ink">{MOTIVI[m].label}.</strong>{" "}
                {MOTIVI[m].aiuto}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Vietato anche raccogliere dati degli altri utenti con strumenti
            automatici, tentare di accedere ad account altrui, e usare la
            piattaforma per inviare messaggi commerciali non richiesti.
          </p>
        </Sezione>

        <Sezione titolo="Segnalazioni e moderazione">
          <p>
            Chiunque può segnalare un contenuto, anche senza avere un account:
            il collegamento si trova sotto ogni profilo e ogni annuncio. Le
            segnalazioni sono esaminate da una persona, in ordine di urgenza e
            di arrivo.
          </p>
          <p>
            Ogni decisione è motivata, e la motivazione viene comunicata a chi ha
            segnalato se ha lasciato un indirizzo. Chi subisce la rimozione di un
            contenuto riceve la stessa motivazione e può contestarla
            rispondendo al messaggio.
          </p>
          <p>
            Le misure vanno dalla rimozione del singolo contenuto alla chiusura
            dell&apos;account, in proporzione alla gravità e alla ripetizione.
            Nei casi che riguardano minori o attività illegali la rimozione è
            immediata e la segnalazione viene inoltrata alle autorità competenti.
          </p>
        </Sezione>

        <Sezione titolo="Chiudere l'account">
          <p>
            Puoi cancellarlo quando vuoi dal{" "}
            <Link href="/dashboard/profilo" className="link-underline">
              tuo profilo
            </Link>
            . La cancellazione è immediata e definitiva. Prima di procedere puoi
            scaricare una copia dei tuoi dati dallo stesso punto.
          </p>
          <p>
            Possiamo sospendere o chiudere un account che viola questi termini.
            Salvo casi gravi, avvisiamo prima e spieghiamo perché.
          </p>
        </Sezione>

        <Sezione titolo="Disponibilità del servizio">
          <p>
            {SITE.name} è fornito così com&apos;è. Non garantiamo che sia sempre
            raggiungibile né privo di difetti: è un servizio gratuito, e
            interruzioni per manutenzione o per problemi dei fornitori sono
            possibili.
          </p>
          <p>
            Facciamo il possibile per non perdere dati, ma tieni una copia di
            ciò a cui tieni. La funzione di esportazione serve anche a questo.
          </p>
        </Sezione>

        <Sezione titolo="Responsabilità">
          <p>
            Nei limiti consentiti dalla legge, {SITE.name} non risponde dei danni
            derivanti da accordi presi fra utenti, da contenuti pubblicati dagli
            utenti, o dall&apos;impossibilità di accedere al servizio.
          </p>
          <p>
            Nulla in questi termini limita i diritti che la legge riconosce ai
            consumatori.
          </p>
        </Sezione>

        <Sezione titolo="Modifiche">
          <p>
            Se cambiamo questi termini aggiorniamo la data in alto e avvisiamo
            per email gli utenti registrati con almeno quindici giorni di
            anticipo. Continuare a usare il servizio dopo l&apos;entrata in
            vigore vale come accettazione; se non sei d&apos;accordo puoi
            cancellare l&apos;account.
          </p>
        </Sezione>

        <Sezione titolo="Legge applicabile">
          <p>
            Si applica la legge italiana. Per le controversie è competente il
            foro di {TITOLARE.foro ? TITOLARE.foro : <Manca>città</Manca>}, salvo il foro del consumatore quando
            previsto.
          </p>
        </Sezione>

        <Sezione titolo="Dati personali">
          <p>
            Come trattiamo i dati è scritto nell&apos;
            <Link href="/privacy" className="link-underline">
              informativa privacy
            </Link>
            , che è parte integrante di questi termini.
          </p>
        </Sezione>
      </article>
    </div>
  );
}
