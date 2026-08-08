"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  Images,
  MessageSquare,
  Trophy,
  Gamepad2,
  Store,
  UserRound,
  Flag,
  Compass,
  Map as MapIcon,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Esci } from "@/components/dashboard/Esci";
import type { Ruolo } from "@/lib/ruolo";

/**
 * Le sezioni, per ruolo.
 *
 * ── Perché due elenchi e non uno ──
 *
 * Era uno solo, e chi si iscrive per **cercare** artisti riceveva il menu di
 * chi vuole **essere trovato**: Portfolio al terzo posto — una sezione che non
 * userà mai — e nessuna via verso gli artisti, che è l'unica cosa per cui è
 * qui. La via c'era, ma nel gruppo secondario in fondo, sotto «Esplora il
 * sito», insieme alla mappa.
 *
 * ── Cosa cambia davvero ──
 *
 * L'ordine è quello del mestiere. Per l'artista: guarda cosa succede, vedi gli
 * ingaggi, mostra i tuoi lavori. Per l'organizzatore: gli ingaggi che hai
 * pubblicato per primi, poi **Cerca artisti** promosso nel gruppo principale,
 * perché sfogliare la directory è metà del suo lavoro e non un'escursione fuori
 * dall'area personale.
 *
 * ── Perché non è un lucchetto ──
 *
 * `/dashboard/portfolio` continua a funzionare per chiunque, anche se non
 * compare nel menu di un organizzatore. Il ruolo qui è un'intenzione
 * dichiarata, non un permesso (vedi `src/lib/ruolo.ts`): un locale con una
 * band residente non deve trovarsi una porta chiusa, deve solo non trovarsela
 * davanti tutti i giorni.
 */
const ITEMS_ARTISTA = [
  { href: "/dashboard", label: "Feed", icon: Home, exact: true },
  { href: "/dashboard/eventi", label: "Ingaggi", icon: CalendarDays },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Images },
  { href: "/dashboard/messaggi", label: "Messaggi", icon: MessageSquare },
  { href: "/dashboard/quest", label: "Quest", icon: Trophy },
  { href: "/dashboard/minigiochi", label: "Minigiochi", icon: Gamepad2 },
  { href: "/dashboard/negozio", label: "Negozio", icon: Store },
  { href: "/dashboard/profilo", label: "Profilo", icon: UserRound },
] as const;

const ITEMS_ORGANIZZATORE = [
  { href: "/dashboard/eventi", label: "I tuoi ingaggi", icon: CalendarDays },
  { href: "/artisti", label: "Cerca artisti", icon: Compass },
  { href: "/dashboard/messaggi", label: "Messaggi", icon: MessageSquare },
  { href: "/dashboard", label: "Feed", icon: Home, exact: true },
  { href: "/dashboard/quest", label: "Obiettivi", icon: Trophy },
  { href: "/dashboard/minigiochi", label: "Minigiochi", icon: Gamepad2 },
  { href: "/dashboard/negozio", label: "Negozio", icon: Store },
  { href: "/dashboard/profilo", label: "Profilo", icon: UserRound },
] as const;

/**
 * La coda di moderazione compare solo a chi ha il ruolo.
 *
 * È una voce di menu, non un controllo di accesso: la pagina si difende da
 * sola. Nasconderla serve a non mostrare a tutti una porta che quasi nessuno
 * può aprire — mostrarla e basta inviterebbe a provarci.
 */
const MODERAZIONE = { href: "/dashboard/moderazione", label: "Segnalazioni", icon: Flag } as const;

/**
 * Le destinazioni del sito pubblico, dentro il menu laterale.
 *
 * Togliendo la barra superiore dall'area personale sparivano anche gli unici
 * accessi ad artisti, ingaggi e mappa. Non è una perdita accettabile: un
 * organizzatore che gestisce le candidature ha bisogno di sfogliare gli
 * artisti nello stesso momento, e un artista che guarda le proprie
 * candidature vuole vedere quali altri ingaggi sono aperti.
 *
 * Stanno in un gruppo separato perché sono un'altra cosa: le prime portano ai
 * *tuoi* dati, queste al sito. Mescolarle darebbe un elenco di nove voci in
 * cui nessuna ha più peso di un'altra.
 */
const PUBBLICHE = [
  { href: "/artisti", label: "Artisti", icon: Compass },
  { href: "/eventi", label: "Ingaggi aperti", icon: CalendarDays },
  { href: "/mappa", label: "Mappa", icon: MapIcon },
] as const;

/**
 * Per l'organizzatore «Artisti» è già in cima, e ripeterlo dodici pixel più
 * sotto con la stessa icona fa dubitare che portino nello stesso posto.
 */
function pubbliche(ruolo: Ruolo) {
  return ruolo === "RECRUITER" ? PUBBLICHE.filter((v) => v.href !== "/artisti") : PUBBLICHE;
}

type Voce = { href: string; label: string; icon: typeof Home; exact?: boolean };

/**
 * Quanto aspetta una risposta, per voce di menu.
 *
 * Solo ciò che richiede un'azione, non ciò che è semplicemente nuovo: un post
 * nel feed non conta perché non ti aspetta nessuno, una candidatura ferma sì.
 * Un indicatore che segnala tutto viene ignorato, e allora tanto vale non
 * averlo.
 */
export type Contatori = { candidature?: number; messaggi?: number; segnalazioni?: number };

function contatoreDi(href: string, c: Contatori): number {
  if (href === "/dashboard/eventi") return c.candidature ?? 0;
  if (href === "/dashboard/messaggi") return c.messaggi ?? 0;
  if (href === "/dashboard/moderazione") return c.segnalazioni ?? 0;
  return 0;
}

/**
 * Il numero accanto alla voce.
 *
 * `aria-label` esplicito perché un numero nudo, letto da uno screen reader
 * dopo l'etichetta, suona come «Ingaggi 3» e non si capisce cosa siano quei
 * tre. Il testo visibile resta il numero: chi vede non ha bisogno di leggere
 * una frase.
 */
function Badge({ n, cosa }: { n: number; cosa: string }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} ${cosa}`}
      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white"
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

const COSA: Record<string, string> = {
  "/dashboard/eventi": "candidature da valutare",
  "/dashboard/messaggi": "conversazioni non lette",
  "/dashboard/moderazione": "segnalazioni in attesa",
};

function voci(ruolo: Ruolo, puoModerare: boolean): Voce[] {
  const base = ruolo === "RECRUITER" ? ITEMS_ORGANIZZATORE : ITEMS_ARTISTA;
  return puoModerare ? [...base, MODERAZIONE] : [...base];
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Colonna laterale su desktop, con indicatore della sezione corrente.
 *
 * ── Perché `sticky` sta qui e non sull'elenco ──
 *
 * Ci stava, e il risultato era che scorrendo una pagina lunga le voci del
 * menu scivolavano **sopra** «Esplora il sito» e «Esci», che invece
 * scorrevano via: testo stampato su altro testo, «Ingaggi» sovrapposto a
 * «Esci». Un elemento appiccicato dentro una colonna che scorre si stacca dal
 * resto della colonna — è il comportamento corretto di `sticky`, applicato al
 * pezzo sbagliato.
 *
 * Il motivo per cui era finito sull'elenco è però reale, e va detto: questa
 * `nav` è una cella di griglia, e una cella di griglia si allunga per
 * default fino all'altezza della riga. Un elemento alto quanto il contenuto
 * accanto non si appiccica mai a niente, perché non ha margine entro cui
 * scorrere. Serve `self-start`, che le ridà l'altezza del proprio contenuto:
 * senza quello, spostare `sticky` sulla `nav` lo disattiverebbe e basta.
 *
 * `max-h` e `overflow-y-auto` coprono il caso opposto: su uno schermo basso
 * — un portatile da tredici pollici con dieci voci — un menu appiccicato più
 * alto della finestra nasconde le ultime voci senza modo di raggiungerle.
 */
export function DashboardSidebar({
  ruolo,
  puoModerare = false,
  contatori = {},
}: {
  ruolo: Ruolo;
  puoModerare?: boolean;
  contatori?: Contatori;
}) {
  const isActive = useIsActive();
  const items = voci(ruolo, puoModerare);

  return (
    <nav
      aria-label="Sezioni dell'area personale"
      className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] self-start overflow-y-auto overscroll-contain pr-1 lg:block"
    >
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                    : "text-ink-muted hover:bg-black/[0.03] hover:text-ink dark:hover:bg-white/[0.04]"
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-600" />
                )}
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
                <Badge n={contatoreDi(item.href, contatori)} cosa={COSA[item.href] ?? ""} />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t pt-4">
        <p className="px-3 pb-2 text-fluid-xs uppercase tracking-wider text-ink-faint">
          Esplora il sito
        </p>
        <ul className="space-y-1">
          {pubbliche(ruolo).map((v) => {
            const Icona = v.icon;
            return (
              <li key={v.href}>
                <Link
                  href={v.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-black/[0.03] hover:text-ink dark:hover:bg-white/[0.04]"
                >
                  <Icona className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {v.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Separato da una riga: uscire non è andare in una sezione, e
          mescolarlo alle altre voci lo rende un bersaglio per il clic
          sbagliato. */}
      <div className="mt-6 border-t pt-4">
        <Esci />
      </div>
    </nav>
  );
}

/**
 * Su mobile la fila di bottoni andava a capo e occupava mezzo schermo.
 * Qui diventa un pannello a scomparsa che si chiude da solo al cambio di
 * pagina — dimenticarlo aperto è l'errore classico di questi menu.
 */
export function DashboardMobileNav({
  ruolo,
  puoModerare = false,
  contatori = {},
}: {
  ruolo: Ruolo;
  puoModerare?: boolean;
  contatori?: Contatori;
}) {
  const pathname = usePathname();
  const isActive = useIsActive();
  const items = voci(ruolo, puoModerare);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    // Blocca lo scorrimento della pagina sotto il pannello
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = items.find((i) => isActive(i.href, i.exact));

  /**
   * Quante cose aspettano una risposta, in tutto.
   *
   * Da telefono la colonna laterale non c'è, quindi i contatori accanto alle
   * voci stanno **dentro un pannello chiuso**: un organizzatore con tre
   * candidature in attesa non vede niente finché non apre il menu, cioè fino
   * a quando non è già andato a cercarle. Un indicatore che si vede solo se
   * lo si va a cercare non serve a niente — ed è tutto il motivo per cui
   * quei contatori esistono.
   */
  const inAttesa =
    (contatori.candidature ?? 0) + (contatori.messaggi ?? 0) + (contatori.segnalazioni ?? 0);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        /* Il testo visibile è il nome della sezione, che da solo non dice che
           il pulsante apre qualcosa. L'etichetta lo aggiunge **conservando**
           quel testo: un'etichetta che lo sostituisse impedirebbe a chi
           comanda il browser con la voce di dire «premi Profilo» (WCAG 2.5.3,
           l'etichetta nel nome). */
        aria-label={`${current?.label ?? "Menu"} — apri il menu delle sezioni`}
        className="btn-ghost min-h-11 w-full justify-between"
      >
        <span className="flex items-center gap-2">
          {current && <current.icon className="h-4 w-4" aria-hidden="true" />}
          {current?.label ?? "Menu"}
        </span>
        <span className="flex items-center gap-2">
          <Badge n={inAttesa} cosa="cose che aspettano una risposta" />
          <Menu className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Chiudi il menu"
            className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] animate-fade-down overflow-y-auto overscroll-contain rounded-2xl border bg-surface p-2 shadow-float"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold">Area personale</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-1">
              {items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                        active ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" : "text-ink"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                      <Badge n={contatoreDi(item.href, contatori)} cosa={COSA[item.href] ?? ""} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 border-t px-2 pt-3">
              <p className="px-1 pb-2 text-fluid-xs uppercase tracking-wider text-ink-faint">
                Esplora il sito
              </p>
              <ul>
                {pubbliche(ruolo).map((v) => {
                  const Icona = v.icon;
                  return (
                    <li key={v.href}>
                      <Link
                        href={v.href}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-muted"
                      >
                        <Icona className="h-4 w-4" aria-hidden="true" />
                        {v.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-2 border-t p-2">
              <Esci />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
