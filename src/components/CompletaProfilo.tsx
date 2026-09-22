"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toSlug } from "@/lib/slug";
import { SCELTE_RUOLO, type Ruolo } from "@/lib/ruolo";

/**
 * Le tre cose che servono prima di entrare.
 *
 * ── Perché tutte e tre insieme, in una schermata sola ──
 *
 * Sono le uniche informazioni da cui dipende **tutto il resto**: il nome
 * compare ovunque, il nickname è l'indirizzo pubblico, il ruolo decide quali
 * sezioni esistono e quale formula calcola la reputazione.
 *
 * Spezzarle in tre passaggi sembrerebbe più gentile e sarebbe peggio: ogni
 * passaggio è un punto in cui si può chiudere la scheda, e chi la chiude a
 * metà resta un utente incoerente — con il nickname e senza il ruolo. Una
 * schermata sola si risponde e basta, sono tre campi.
 *
 * ── Perché il nickname si chiede adesso ──
 *
 * Finisce in `/artisti/[slug]`. Generarlo dal nome e lasciarlo cambiare dopo
 * significa che il primo indirizzo condiviso, e quello che Google ha
 * indicizzato, smettono di funzionare. Un indirizzo si sceglie una volta,
 * prima che esista qualcosa che ci punta.
 *
 * Il campo parte pieno con la proposta ricavata dal nome — così chi non ha
 * opinioni preme avanti — ma è modificabile, ed è quella la differenza con
 * prima: allora la proposta era una decisione presa da qualcun altro.
 *
 * ── Perché la verifica di Google non basta più ──
 *
 * Entrando con Google si arrivava dentro con nome, email e foto, e con il
 * ruolo `ARTIST` per difetto: chi si iscriveva per **cercare** artisti
 * riceveva il prodotto dell'altro lato senza aver mai avuto occasione di dire
 * il contrario, e senza sapere che ci fosse un contrario.
 *
 * Google verifica un'identità. Non sa da che parte stai, e non c'è modo di
 * chiederglielo: da qui questa schermata, che è la sola porta verso la
 * dashboard.
 */
export function CompletaProfilo({
  nomeIniziale,
  ruoloIniziale,
}: {
  nomeIniziale: string;
  ruoloIniziale: Ruolo;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeIniziale);
  const [ruolo, setRuolo] = useState<Ruolo>(ruoloIniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  /**
   * Il nickname: proposto finché non lo si tocca, poi è tuo.
   *
   * `null` significa «non ancora toccato», e non è la stessa cosa della
   * stringa vuota: con la stringa vuota, chi cancella tutto per riscriverlo si
   * vedrebbe ricomparire la proposta sotto le dita a ogni lettera del nome.
   */
  const [nickScelto, setNickScelto] = useState<string | null>(null);
  const proposta = useMemo(() => toSlug(nome).slice(0, 30), [nome]);
  const nick = nickScelto ?? proposta;

  function invia(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    avvia(async () => {
      const res = await fetch("/api/profile/completa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, slug: nick, ruolo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrore(json.error ?? "Non è andata");
        return;
      }
      // `refresh` prima di `push`: il layout della dashboard legge il ruolo dal
      // database, e senza rileggerlo rimanderebbe qui — un rimbalzo che
      // sembrerebbe un errore proprio nel momento in cui è andato tutto bene.
      router.refresh();
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={invia} className="space-y-8">
      <div>
        <label htmlFor="c-nome" className="mb-1 block text-fluid-sm font-medium">
          Come ti chiami
        </label>
        <input
          id="c-nome"
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
        />
        <p className="mt-1.5 text-fluid-xs text-ink-faint">
          Il nome con cui comparirai. Può essere quello d&apos;arte.
        </p>
      </div>

      <div>
        <label htmlFor="c-nick" className="mb-1 block text-fluid-sm font-medium">
          Il tuo indirizzo
        </label>
        <div className="flex items-center gap-1 rounded-xl border bg-surface-sunken px-3">
          <span className="shrink-0 text-fluid-sm text-ink-faint">vybes.it/artisti/</span>
          <input
            id="c-nick"
            className="min-w-0 flex-1 bg-transparent py-3 text-fluid-sm outline-none"
            value={nick}
            /* Si normalizza a ogni battuta invece di rifiutare dopo l'invio:
               far scrivere «Mario Rossi» per poi dire che non va bene è un
               modo di far perdere tempo a qualcuno per una regola che si
               poteva applicare da soli. */
            onChange={(e) => setNickScelto(toSlug(e.target.value).slice(0, 30))}
            required
            minLength={3}
            maxLength={30}
            autoComplete="username"
            spellCheck={false}
          />
        </div>
        <p className="mt-1.5 text-fluid-xs text-ink-faint">
          Sceglilo adesso: è l&apos;indirizzo che condividerai, e cambiarlo dopo rompe i
          collegamenti già in giro.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 text-fluid-sm font-medium">Da che parte stai</legend>
        <p className="mb-3 text-fluid-xs text-ink-faint">
          Decide le sezioni che vedi, gli obiettivi che ti vengono proposti e come viene calcolata
          la tua reputazione. Si cambia dal profilo.
        </p>
        <div className="grid gap-3">
          {SCELTE_RUOLO.map((s) => (
            <label
              key={s.valore}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                ruolo === s.valore
                  ? "border-brand-500 bg-brand-500/5"
                  : "hover:border-border-strong"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="ruolo"
                  className="mt-1"
                  value={s.valore}
                  checked={ruolo === s.valore}
                  onChange={() => setRuolo(s.valore)}
                />
                <span>
                  <span className="block font-semibold">{s.titolo}</span>
                  <span className="muted mt-0.5 block text-fluid-sm">{s.descrizione}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {errore && (
        <p role="alert" className="text-esito-no text-fluid-sm">
          {errore}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3.5" disabled={inCorso}>
        {inCorso ? "Un attimo…" : "Entra"}
        {!inCorso && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </form>
  );
}
