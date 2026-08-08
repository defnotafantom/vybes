import {
  BadgeCheck,
  CalendarClock,
  Compass,
  Images,
  MessageSquareReply,
  Star,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import type { Distintivo } from "@/lib/distintivi";

/**
 * I distintivi, sulla pagina pubblica di un artista.
 *
 * ── Perché sobri ──
 *
 * Devono leggersi come credenziali, non come trofei. È tutta la differenza
 * fra un profilo che un organizzatore prende sul serio e uno che gli sembra
 * un gioco — e quella distinzione è la ragione per cui questo sistema esiste
 * in questa forma e non con monete e cappelli (ADR-042).
 *
 * In pratica: niente oro, niente medaglie, niente scintille. Una pillola con
 * un'icona sottile, la stessa tinta del resto del sito, e il significato in
 * `title` per chi ci passa sopra.
 *
 * ── Il significato non è decorativo ──
 *
 * «Scelto 3 volte» da solo si può fraintendere in dieci modi. Il testo esteso
 * — «almeno tre organizzatori hanno accettato una sua candidatura» — è quello
 * che trasforma un'etichetta in un'informazione, e sta sia in `title` sia
 * nell'etichetta accessibile, perché `title` sui dispositivi tattili non si
 * apre mai.
 */
const ICONE: Record<string, typeof Star> = {
  verificato: BadgeCheck,
  ingaggiato: Trophy,
  organizzatore: Star,
  portfolio: Images,
  raggiungibile: Compass,
  dal: CalendarClock,
  // ── Quelli di chi ingaggia ──
  // Icone diverse da quelle dell'artista anche dove il concetto è vicino: le
  // due famiglie non compaiono mai sulla stessa pagina, ma chi passa da un
  // profilo all'altro deve accorgersi di stare guardando un'altra cosa.
  risponde: MessageSquareReply,
  paga: Wallet,
  scelti: Users,
};

export function Distintivi({ distintivi }: { distintivi: Distintivo[] }) {
  if (distintivi.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {distintivi.map((d) => {
        const Icona = ICONE[d.chiave] ?? Star;
        return (
          <li
            key={d.chiave}
            title={d.significato}
            aria-label={`${d.etichetta}. ${d.significato}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/25 bg-brand-500/[0.07]
                       px-2.5 py-1 text-fluid-xs font-semibold text-brand-700 dark:text-brand-300"
          >
            <Icona className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {d.etichetta}
          </li>
        );
      })}
    </ul>
  );
}
