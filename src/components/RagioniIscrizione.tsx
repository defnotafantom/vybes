import { Globe, MessageSquare, Trash2, CalendarPlus, Layers, HandCoins } from "lucide-react";

/**
 * Cosa si ottiene iscrivendosi, accanto al modulo.
 *
 * ── Il buco che chiude ──
 *
 * La pagina di registrazione era un modulo su uno schermo vuoto: «Crea il tuo
 * account», tre campi, un pulsante. Nessuna ragione in vista.
 *
 * È il punto in cui si perde più gente di tutto l'imbuto, ed è anche quello
 * dove arriva chi viene da un messaggio diretto — il canale su cui poggia
 * tutto il reclutamento (RECLUTAMENTO.md). Quella persona ha letto due righe
 * su Instagram, ha cliccato, e si è trovata davanti un modulo che non le
 * ricorda perché era interessata.
 *
 * ── Perché cambia col ruolo ──
 *
 * Perché le due parti vogliono cose diverse e opposte: l'artista vuole essere
 * trovato, l'organizzatore vuole trovare. Un elenco solo, valido per
 * entrambi, non parlerebbe a nessuno dei due. L'interruttore che sceglie il
 * ruolo esisteva già e cambiava già l'etichetta del primo campo: qui fa un
 * lavoro in più senza chiedere niente in cambio.
 *
 * ── Perché sono tre e non sei ──
 *
 * Perché nessuno le legge tutte, e la terza è quella che conta: dice come si
 * esce. Un elenco di vantaggi che non nomina mai la via d'uscita si legge
 * come una vendita; nominarla è la cosa che toglie il sospetto — e su questo
 * sito è anche vera, la cancellazione dell'account è implementata sul serio.
 *
 * ── Ogni riga è verificabile ──
 *
 * Nessuna promessa sul futuro, nessun «entra nella community». Tutto quello
 * che c'è scritto o è già nel prodotto o non c'è scritto.
 */
const RAGIONI = {
  ARTIST: [
    {
      Icona: Globe,
      t: "Una pagina tua, su Google",
      d: "Il profilo diventa un indirizzo pubblico indicizzato: chi cerca la tua disciplina nella tua città può trovarti.",
    },
    {
      Icona: MessageSquare,
      t: "Ti scrivono direttamente",
      d: "Nessuna agenzia in mezzo e nessuna commissione sul cachet: la conversazione è fra te e chi organizza.",
    },
    {
      Icona: Trash2,
      t: "Te ne vai quando vuoi",
      d: "Cancelli l'account dal profilo, e con quello spariscono profilo, portfolio e messaggi. Un clic, senza scriverci.",
    },
  ],
  RECRUITER: [
    {
      Icona: CalendarPlus,
      t: "Pubblichi in due minuti",
      d: "Data, luogo e compenso. L'annuncio finisce nella directory della città e sulla mappa.",
    },
    {
      Icona: Layers,
      t: "Ricevi candidature con il portfolio",
      d: "Ogni artista allega lavori e un messaggio: valuti in un colpo d'occhio invece di chiedere in giro.",
    },
    {
      Icona: HandCoins,
      t: "Niente commissioni",
      d: "Non tratteniamo percentuali sul cachet. Quello che concordate resta fra voi.",
    },
  ],
} as const;

export function RagioniIscrizione({ ruolo }: { ruolo: "ARTIST" | "RECRUITER" }) {
  return (
    <ul className="space-y-6">
      {RAGIONI[ruolo].map(({ Icona, t, d }) => (
        <li key={t} className="flex gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"
          >
            <Icona className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-fluid-sm font-semibold">{t}</span>
            <span className="mt-1 block text-fluid-sm leading-relaxed text-ink-muted">{d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
