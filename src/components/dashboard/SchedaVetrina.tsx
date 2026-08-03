import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Il proprio turno in vetrina.
 *
 * ── Perché serve dirlo ──
 *
 * La vetrina in home ruota fra tutti i profili che superano la soglia
 * (`lib/vetrina.ts`). È il secondo dei premi in visibilità (ADR-042), e da
 * sola non incentiva niente: un premio che non si sa di poter vincere è un
 * premio che non esiste. Questa scheda è l'unica cosa che lo trasforma in un
 * motivo per completare il profilo.
 *
 * ── Perché un numero di giorni e non «sei in rotazione» ──
 *
 * Perché «sei in rotazione» non si può verificare, e una promessa che non si
 * può verificare vale zero. «Fra sei giorni» è un impegno: se il settimo
 * giorno non è successo, chi legge se ne accorge — ed è giusto che se ne
 * accorga, perché vorrebbe dire che qualcosa non funziona.
 *
 * ── Chi non c'è ancora ──
 *
 * Non gli si dice «non ci sei»: gli si dice cosa manca. La differenza è fra
 * una porta chiusa e una porta con scritto sopra come si apre — e la soglia è
 * la stessa che rende un profilo trovabile su Google, quindi il consiglio è
 * comunque quello giusto anche per chi della vetrina non gli importa niente.
 */
export function SchedaVetrina({
  ammesso,
  fraGiorni,
  quanti,
}: {
  ammesso: boolean;
  /** Zero significa: sei in vetrina adesso. */
  fraGiorni: number;
  /** Quanti profili sono in rotazione, per dare la scala. */
  quanti: number;
}) {
  if (!ammesso) {
    return (
      <section className="card">
        <h2 className="flex items-center gap-2 text-fluid-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden="true" />
          La vetrina in home
        </h2>
        <p className="mt-2 text-fluid-sm text-ink-muted">
          Ogni giorno sei profili compaiono in prima pagina, a turno. Per
          entrare nella rotazione serve il profilo pubblico e l&apos;indirizzo
          email confermato — le stesse due cose che ti rendono trovabile su
          Google.
        </p>
        <Link href="/dashboard/profilo" className="btn-ghost mt-4 inline-flex">
          Completa il profilo
        </Link>
      </section>
    );
  }

  return (
    <section className={`card ${fraGiorni === 0 ? "border-brand-400/50 shadow-glow-brand" : ""}`}>
      <h2 className="flex items-center gap-2 text-fluid-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden="true" />
        La vetrina in home
      </h2>

      {fraGiorni === 0 ? (
        <>
          <p className="mt-2 text-fluid-base font-semibold text-brand-700 dark:text-brand-300">
            Oggi ci sei tu.
          </p>
          <p className="mt-1 text-fluid-sm text-ink-muted">
            Il tuo profilo è in prima pagina. È il giorno giusto per avere il
            portfolio in ordine.
          </p>
          <Link href="/" className="btn-ghost mt-4 inline-flex">
            Vedi la home
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-fluid-base font-semibold">
            {fraGiorni === 1 ? "Domani tocca a te." : `Fra ${fraGiorni} giorni tocca a te.`}
          </p>
          <p className="mt-1 text-fluid-sm text-ink-muted">
            {/* La scala serve: «fra 40 giorni» senza sapere che siete in
                duecento sembra un rifiuto, e sapendolo diventa una fila. */}
            Sei in rotazione insieme ad altri {quanti - 1} profili: il turno
            arriva a tutti, un giorno alla volta.
          </p>
        </>
      )}
    </section>
  );
}
