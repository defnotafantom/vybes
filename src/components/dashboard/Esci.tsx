"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/**
 * Uscita dall'account.
 *
 * Non esisteva. In tutta l'applicazione `signOut` era chiamato in un punto
 * solo — dopo la cancellazione dell'account — quindi chi entrava non aveva
 * nessun modo di uscire se non svuotando i cookie del browser.
 *
 * È una mancanza che non si nota costruendo, perché chi sviluppa resta sempre
 * autenticato, e si nota subito usando: la prima volta che si vuole provare
 * l'iscrizione con un altro account non si sa come fare.
 *
 * Sta in fondo al menu laterale, separato dalle voci di navigazione da una
 * riga: uscire non è andare in una sezione, e mescolarlo alle altre lo rende
 * un bersaglio per il clic sbagliato.
 */
export function Esci() {
  const [inCorso, setInCorso] = useState(false);

  return (
    <button
      type="button"
      disabled={inCorso}
      onClick={() => {
        setInCorso(true);
        // Alla home e non al login: uscire vuol dire tornare al sito, non
        // trovarsi davanti a un modulo che chiede di rientrare.
        signOut({ callbackUrl: "/" });
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-black/[0.03] hover:text-ink dark:hover:bg-white/[0.04]"
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {inCorso ? "Esco…" : "Esci"}
    </button>
  );
}
