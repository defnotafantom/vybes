"use client";

import { useState } from "react";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { RegisterForm } from "@/components/RegisterForm";
import { RagioniIscrizione } from "@/components/RagioniIscrizione";

/**
 * La pagina di iscrizione: il modulo e le ragioni per compilarlo.
 *
 * ── Perché esiste questo contenitore ──
 *
 * Le ragioni cambiano col ruolo — l'artista vuole essere trovato,
 * l'organizzatore vuole trovare — e il ruolo è uno stato del modulo. Due
 * fratelli che devono leggere lo stesso stato lo prendono dal genitore
 * comune: è il motivo per cui questo componente c'è, e l'unica cosa che fa.
 *
 * L'alternativa che avevo provato era tenerle dentro il modulo e spostarle a
 * lato con una griglia CSS. Sarebbe stata più corta e sbagliata: trasformare
 * il `<form>` in griglia avrebbe scardinato la spaziatura di tutti i campi
 * per sistemare un blocco solo. Quando il rimedio grafico deve toccare un
 * elemento che non c'entra, di solito il problema è la struttura.
 *
 * ── L'ordine, che su telefono è il contrario ──
 *
 * Su schermo stretto le ragioni vanno **dopo** il modulo. Chi arriva qui da un
 * messaggio diretto — il canale su cui poggia tutto il reclutamento — ha già
 * deciso, e mettergli tre paragrafi fra sé e il campo del nome allunga la
 * strada a chi era pronto a percorrerla. Chi esita, invece, scorre e le
 * trova. Su schermo largo stanno a fianco e non costano un centimetro.
 */
export function Iscrizione({
  defaultRole,
  googleEnabled,
}: {
  defaultRole: "ARTIST" | "RECRUITER";
  googleEnabled: boolean;
}) {
  const [role, setRole] = useState(defaultRole);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-x-16">
      <div className="min-w-0">
        {googleEnabled && <GoogleSignIn />}
        <RegisterForm defaultRole={defaultRole} role={role} onRoleChange={setRole} />
      </div>

      <aside className="border-t pt-10 lg:border-0 lg:pt-2">
        <p className="mb-6 text-fluid-xs uppercase tracking-wider text-ink-faint">
          Cosa ottieni
        </p>
        <RagioniIscrizione ruolo={role} />
      </aside>
    </div>
  );
}
