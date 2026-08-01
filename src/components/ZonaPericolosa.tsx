"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/Toast";

/**
 * Esportazione e cancellazione dell'account — artt. 20 e 17 del GDPR.
 *
 * Sono due diritti, non due funzioni facoltative, e stanno vicini per un
 * motivo pratico: chi sta per andarsene è esattamente la persona a cui serve
 * portarsi via i propri dati. Metterli in due punti diversi dell'interfaccia
 * significa che quasi nessuno esporterà nulla.
 *
 * La cancellazione chiede una riconferma esplicita — la password, o il proprio
 * nome per chi è entrato con Google. Non è attrito messo lì per scoraggiare:
 * senza, basterebbe un link malevolo aperto in una scheda già autenticata.
 */
export function ZonaPericolosa({ haPassword, nome }: { haPassword: boolean; nome: string }) {
  const [aperto, setAperto] = useState(false);
  const [conferma, setConferma] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const toast = useToast();

  async function elimina(e: React.FormEvent) {
    e.preventDefault();
    setInCorso(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conferma }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.push(body.error ?? "Non è stato possibile eliminare l'account", "error");
        setInCorso(false);
        return;
      }

      // L'account non c'è più: la sessione va chiusa, altrimenti il browser
      // continua a presentare un cookie che punta a un utente inesistente e
      // ogni pagina protetta risponde con un errore invece che con il login.
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.push("Errore di rete, riprova", "error");
      setInCorso(false);
    }
  }

  return (
    <section className="mt-16 border-t pt-10">
      <h2 className="text-fluid-lg font-bold">I tuoi dati</h2>

      <div className="card mt-5">
        <p className="text-fluid-sm font-semibold">Scarica una copia</p>
        <p className="mt-2 text-fluid-sm text-ink-muted">
          Un file JSON con profilo, portfolio, post, candidature ed eventi
          pubblicati. Non contiene la password, salvata solo in forma non
          reversibile, né i messaggi ricevuti, che appartengono anche a chi te
          li ha scritti.
        </p>
        <a href="/api/profile/esporta" className="btn-ghost mt-4 inline-flex" download>
          <Download className="h-4 w-4" aria-hidden="true" />
          Esporta i miei dati
        </a>
      </div>

      <div className="card mt-4 border-red-400/40">
        <p className="flex items-center gap-2 text-fluid-sm font-semibold text-red-400">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Elimina l&apos;account
        </p>
        <p className="mt-2 text-fluid-sm text-ink-muted">
          Spariscono profilo pubblico, portfolio, post, commenti, candidature,
          eventi che hai pubblicato e messaggi che hai inviato. È definitivo:
          non c&apos;è un cestino e non possiamo recuperare nulla.
        </p>

        {!aperto ? (
          <button type="button" className="btn-danger mt-4" onClick={() => setAperto(true)}>
            Elimina l&apos;account
          </button>
        ) : (
          <form onSubmit={elimina} className="mt-5">
            <label htmlFor="conferma" className="block text-fluid-sm font-medium">
              {haPassword
                ? "Scrivi la tua password per confermare"
                : `Scrivi «${nome}» per confermare`}
            </label>
            <input
              id="conferma"
              className="input mt-2"
              type={haPassword ? "password" : "text"}
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              autoComplete={haPassword ? "current-password" : "off"}
              required
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" className="btn-danger" disabled={inCorso || !conferma}>
                {inCorso ? "Eliminazione…" : "Confermo, elimina tutto"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setAperto(false);
                  setConferma("");
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
