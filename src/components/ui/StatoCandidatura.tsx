import { PARTICIPATION_STATUS } from "@/lib/constants";

/**
 * Lo stato di una candidatura, con un colore che significa qualcosa.
 *
 * Prima erano tutti la stessa pillola viola: «In attesa», «Confermata» e
 * «Rifiutata» avevano lo stesso identico aspetto in un elenco dove lo stato è
 * l'unica informazione che conta davvero. Bisognava leggere ogni riga per
 * sapere com'era andata.
 *
 * I colori seguono il significato, non la palette: verde per una conferma,
 * ambra per un'attesa, neutro spento per un no. Il rosso è volutamente
 * escluso — un rifiuto non è un errore né un pericolo, e colorarlo di rosso
 * lo fa sembrare più grave di quanto sia in un elenco che si guarda spesso.
 *
 * Ogni variante porta anche un punto colorato: il colore da solo non è
 * accessibile a chi non lo distingue, ma il testo c'è già e la forma aggiunge
 * un secondo appiglio senza costare niente.
 */
const STILI: Record<string, { pillola: string; punto: string }> = {
  ACCEPTED: {
    pillola: "bg-esito-ok-tinta/10 text-esito-ok ring-esito-ok-tinta/25",
    punto: "bg-esito-ok-tinta",
  },
  PENDING: {
    pillola: "bg-esito-attesa-tinta/10 text-esito-attesa ring-esito-attesa-tinta/25",
    punto: "bg-esito-attesa-tinta",
  },
  REJECTED: {
    pillola: "bg-ink/[0.04] text-ink-muted ring-line dark:bg-ink/[0.05]",
    punto: "bg-ink-muted",
  },
  CANCELLED: {
    pillola: "bg-ink/[0.04] text-ink-muted ring-line dark:bg-ink/[0.05]",
    punto: "bg-ink-muted",
  },
};

export function StatoCandidatura({ stato }: { stato: string }) {
  const s = STILI[stato] ?? STILI.CANCELLED;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-fluid-xs font-semibold ring-1 ring-inset ${s.pillola}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.punto}`} aria-hidden="true" />
      {PARTICIPATION_STATUS[stato as keyof typeof PARTICIPATION_STATUS] ?? stato}
    </span>
  );
}
