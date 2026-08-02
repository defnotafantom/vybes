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
  UserRound,
  Flag,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Feed", icon: Home, exact: true },
  { href: "/dashboard/eventi", label: "Ingaggi", icon: CalendarDays },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Images },
  { href: "/dashboard/messaggi", label: "Messaggi", icon: MessageSquare },
  { href: "/dashboard/quest", label: "Quest", icon: Trophy },
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

function voci(puoModerare: boolean): Voce[] {
  return puoModerare ? [...ITEMS, MODERAZIONE] : [...ITEMS];
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Colonna laterale su desktop, con indicatore della sezione corrente. */
export function DashboardSidebar({
  puoModerare = false,
  contatori = {},
}: {
  puoModerare?: boolean;
  contatori?: Contatori;
}) {
  const isActive = useIsActive();
  const items = voci(puoModerare);

  return (
    <nav aria-label="Sezioni dell'area personale" className="hidden lg:block">
      <ul className="sticky top-24 space-y-1">
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
    </nav>
  );
}

/**
 * Su mobile la fila di bottoni andava a capo e occupava mezzo schermo.
 * Qui diventa un pannello a scomparsa che si chiude da solo al cambio di
 * pagina — dimenticarlo aperto è l'errore classico di questi menu.
 */
export function DashboardMobileNav({
  puoModerare = false,
  contatori = {},
}: {
  puoModerare?: boolean;
  contatori?: Contatori;
}) {
  const pathname = usePathname();
  const isActive = useIsActive();
  const items = voci(puoModerare);
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

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost w-full justify-between"
      >
        <span className="flex items-center gap-2">
          {current && <current.icon className="h-4 w-4" aria-hidden="true" />}
          {current?.label ?? "Menu"}
        </span>
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Chiudi il menu"
            className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-3 top-3 animate-fade-down rounded-2xl border bg-surface p-2 shadow-float">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold">Area personale</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
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
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
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
          </div>
        </div>
      )}
    </div>
  );
}
