"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, User, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Chi sei, nella barra del sito pubblico.
 *
 * ── Il difetto ──
 *
 * L'intestazione mostrava «Accedi / Iscriviti» **sempre**, anche a sessione
 * aperta. Chi era autenticato e usciva dalla dashboard per guardare un
 * profilo si ritrovava davanti un sito che lo invitava a iscriversi: la
 * lettura naturale è «sono stato disconnesso», e non c'era alcun modo di
 * capire il contrario senza tornare a mano su /dashboard.
 *
 * La sessione, in realtà, dura un anno (ADR sulla durata). Il problema non era
 * mai stato l'autenticazione: era che il sito pubblico non se ne accorgeva.
 *
 * ── Perché lato client, e non `await auth()` nel layout ──
 *
 * Sarebbe la strada più diretta, e sarebbe la peggiore: `auth()` legge i
 * cookie, e leggere i cookie nel layout radice rende **dinamica ogni pagina
 * del sito**. Le pagine di città e i profili sono generati staticamente e
 * rigenerati ogni ora: è ciò che li rende veloci e ciò su cui poggia tutta la
 * strategia di ricerca organica. Scambiare la generazione statica dell'intero
 * sito pubblico per un avatar in alto a destra è un pessimo affare.
 *
 * Qui la sessione arriva invece da `useSession()`, cioè da una richiesta che
 * parte dopo il caricamento. Il costo è che per un istante non sappiamo chi
 * sei — e quell'istante va gestito, non ignorato: durante `loading` non si
 * mostra né l'una né l'altra cosa, perché mostrare «Accedi» a qualcuno che è
 * autenticato e poi sostituirlo è esattamente il messaggio sbagliato, dato in
 * modo lampeggiante. Al suo posto un segnaposto della stessa larghezza, così
 * la barra non sobbalza quando la risposta arriva.
 */
export function MenuUtente() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [aperto, setAperto] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => setAperto(false), [pathname]);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    document.addEventListener("mousedown", fuori);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuori);
      document.removeEventListener("keydown", esc);
    };
  }, [aperto]);

  // Segnaposto: occupa lo spazio senza affermare niente.
  if (status === "loading") {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-surface-sunken" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <>
        {/* «Accedi» era `hidden sm:inline-flex`: sotto i 640px spariva, e
            l'unico pulsante rimasto invitava a iscriversi di nuovo chi aveva
            già un account. Ora resta sempre; a cedere sotto i 400px è
            «Iscriviti», che è la scritta più lunga e la meno urgente per chi
            sta tornando. */}
        <Link href="/accedi" className="btn-ghost">
          Accedi
        </Link>
        <Link href="/registrati" className="btn-primary hidden min-[400px]:inline-flex">
          Iscriviti
        </Link>
      </>
    );
  }

  const nome = session.user.name ?? "Il mio account";

  return (
    <div className="relative" ref={contenitore}>
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-xl border bg-surface px-2 py-1.5 transition-colors hover:border-brand-400/60"
      >
        <Avatar name={nome} src={session.user.image} size="xs" />
        {/* Il nome sparisce su schermi stretti, l'avatar no: è l'elemento che
            risponde alla domanda «sono dentro?», ed è quello che deve restare
            proprio dove lo spazio manca. */}
        <span className="hidden max-w-32 truncate text-fluid-sm font-medium sm:block">{nome}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
      </button>

      {aperto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-down overflow-hidden rounded-2xl border bg-surface-raised p-1.5 shadow-float"
        >
          <p className="truncate px-3 py-2 text-fluid-xs text-ink-faint">{session.user.email}</p>

          <Link
            href="/dashboard"
            role="menuitem"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-fluid-sm font-medium hover:bg-brand-500/[0.08]"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
            Area personale
          </Link>

          <Link
            href="/dashboard/profilo"
            role="menuitem"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-fluid-sm font-medium hover:bg-brand-500/[0.08]"
          >
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            Il mio profilo
          </Link>

          <div className="mt-1.5 border-t pt-1.5">
            {/* Stessa uscita del pulsante nella barra laterale: la sessione
                finisce solo qui, quindi il modo di chiuderla deve essere
                raggiungibile da entrambi i lati del sito. */}
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-fluid-sm font-medium text-ink-muted hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
