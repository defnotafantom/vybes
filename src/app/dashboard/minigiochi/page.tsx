import Link from "next/link";
import { Ear, Trophy, Coins, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { giornoDi } from "@/lib/vetrina";
import { settimanaDi, giorniAllaFine } from "@/lib/orecchio";
import { partitaDiOggi, classificaDi, turnoDi } from "@/lib/orecchio-server";
import { statoRuota } from "@/lib/ruota-server";
import { conta } from "@/lib/testo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minigiochi" };

/**
 * L'indice dei minigiochi.
 *
 * ── Perché una sezione e non voci sparse ──
 *
 * «L'orecchio» era una voce di menu accanto a Profilo e Ingaggi, cioè accanto
 * al lavoro. Con un secondo gioco sarebbero state due, e col terzo il menu
 * dell'area personale avrebbe raccontato un sito che è per metà un passatempo
 * — proprio mentre ADR-042 stabiliva il contrario: il gioco è **un contorno**,
 * e deve stare in un posto suo dove chi lo vuole lo trova e chi non lo vuole
 * non ci inciampa.
 *
 * ── Perché l'indice dice cosa c'è da fare oggi ──
 *
 * Un elenco di due schede è una pagina inutile se non aggiunge niente:
 * tanto varrebbe portare direttamente al gioco. Quello che aggiunge è lo
 * **stato** — hai già giocato, la ruota è carica, sei quinto in classifica —
 * cioè la risposta alla sola domanda che porta qualcuno ad aprire questa
 * sezione.
 */
export default async function MinigiochiPage() {
  const session = await auth();
  const userId = session!.user.id;
  const giorno = giornoDi();

  const [partita, ruota, classifica, me, domande] = await Promise.all([
    partitaDiOggi(userId, giorno),
    statoRuota(userId, giorno),
    classificaDi(settimanaDi(giorno)),
    prisma.user.findUnique({ where: { id: userId }, select: { monete: true, slug: true } }),
    turnoDi(giorno),
  ]);

  const mioPosto = classifica.righe.find((r) => r.slug === me?.slug);
  const disponibile = domande.length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <SezioneHeader
        titolo="Minigiochi"
        sottotitolo="Un contorno, non il piatto: quello che si vince è estetica e non sposta di un centimetro la tua posizione negli elenchi. Ma le monete si guadagnano qui."
        numeri={[
          { label: "Monete", valore: me?.monete ?? 0 },
          { label: ["Punto questa settimana", "Punti questa settimana"], valore: mioPosto?.punti ?? 0 },
        ]}
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        <Scheda
          href="/dashboard/minigiochi/orecchio"
          icona={Ear}
          titolo="L'orecchio"
          descrizione="Cinque lavori di artisti iscritti qui. Indovina di chi sono. Il turno è lo stesso per tutti e cambia ogni giorno."
          stato={
            !disponibile
              ? { testo: "Non ancora disponibile", tono: "spento" }
              : partita
                ? { testo: `Fatto: ${partita.punteggio} punti`, tono: "fatto" }
                : { testo: "Da giocare oggi", tono: "pronto" }
          }
        />

        <Scheda
          href="/dashboard/negozio"
          icona={Coins}
          titolo="La ruota"
          descrizione="Un giro al giorno, dieci a duecento monete. Si apre dopo aver fatto qualcosa qui dentro: sta nel negozio, dove poi le monete si spendono."
          stato={
            ruota.stato === "gia-girata"
              ? { testo: `Girata: ${ruota.premio.etichetta}`, tono: "fatto" }
              : ruota.stato === "pronta"
                ? { testo: "Carica, da girare", tono: "pronto" }
                : { testo: "Si apre facendo qualcosa", tono: "spento" }
          }
        />
      </ul>

      <section className="card mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-fluid-lg font-bold">
            <Trophy className="h-5 w-5 text-gold-400" aria-hidden="true" />
            Classifica della settimana
          </h2>
          <span className="text-fluid-xs text-ink-faint">
            {conta(giorniAllaFine(giorno), "giorno", "giorni")} alla fine
          </span>
        </div>

        {classifica.righe.length === 0 ? (
          <p className="mt-4 text-fluid-sm text-ink-muted">
            Questa settimana non ha ancora giocato nessuno. Il primo punto vale
            un primo posto.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {classifica.righe.slice(0, 5).map((r) => (
              <li
                key={r.slug}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-fluid-sm ${
                  r.slug === me?.slug ? "bg-brand-500/10" : ""
                }`}
              >
                <span
                  className={`w-5 shrink-0 text-right font-bold tabular-nums ${
                    r.posizione <= 3 ? "text-gold-400" : "text-ink-faint"
                  }`}
                >
                  {r.posizione}
                </span>
                <Link
                  href={`/artisti/${r.slug}`}
                  className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-brand-600"
                >
                  {r.nome}
                </Link>
                <span className="shrink-0 font-bold tabular-nums">{r.punti}</span>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-5 border-t pt-4 text-fluid-xs text-ink-muted">
          Si azzera ogni lunedì. Una classifica che non riparte la vince chi è
          arrivato per primo, e dopo un mese nessun altro prova più.
        </p>
      </section>
    </div>
  );
}

const TONI = {
  pronto: "border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300",
  fatto: "border-esito-si-tinta/40 bg-esito-si-tinta/10 text-esito-si",
  spento: "border-line text-ink-faint",
} as const;

function Scheda({
  href,
  icona: Icona,
  titolo,
  descrizione,
  stato,
}: {
  href: string;
  icona: typeof Ear;
  titolo: string;
  descrizione: string;
  stato: { testo: string; tono: keyof typeof TONI };
}) {
  return (
    <li>
      <Link href={href} className="card-interactive group flex h-full flex-col">
        <span className="flex items-center gap-2">
          <Icona className="h-5 w-5 text-brand-500" aria-hidden="true" />
          <span className="text-fluid-base font-bold">{titolo}</span>
        </span>
        <span className="mt-2 block text-fluid-sm text-ink-muted">{descrizione}</span>

        {/* Lo stato in fondo e il comando accanto: `mt-auto` allinea i due
            piedi anche quando le descrizioni hanno lunghezze diverse, che in
            una griglia di due è la differenza fra ordinato e sciatto. */}
        <span className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-fluid-xs font-semibold ${TONI[stato.tono]}`}
          >
            {stato.testo}
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  );
}
