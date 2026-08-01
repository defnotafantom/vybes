import { SITE, siteUrl } from "@/lib/constants";

/**
 * Invio email tramite Resend via REST: nessuna dipendenza aggiuntiva e
 * nessun SDK da tenere aggiornato.
 *
 * Senza RESEND_API_KEY l'email viene stampata in console con il link
 * cliccabile: lo sviluppo locale funziona senza configurare niente, ma
 * `emailIsConfigured()` permette al resto del codice di sapere che in
 * produzione manca qualcosa.
 */
export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type SendInput = { to: string; subject: string; html: string; text: string };

async function send({ to, subject, html, text }: SendInput): Promise<void> {
  if (!emailIsConfigured()) {
    console.info(
      `\n──────── EMAIL NON INVIATA (RESEND_API_KEY assente) ────────\n` +
        `A:       ${to}\nOggetto: ${subject}\n\n${text}\n` +
        `────────────────────────────────────────────────────────────\n`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    // Si registra ma non si solleva: un'email non partita non deve far
    // fallire la registrazione, il token resta valido e rinviabile.
    console.error(`[email] invio fallito (${res.status}): ${detail}`);
  }
}

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f5f3ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <tr><td>
      <p style="margin:0 0 24px;font-size:20px;font-weight:700"><span style="color:#7c3aed">Vy</span>bes</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${title}</h1>
      <div style="font-size:15px;line-height:1.6;color:#3f3f46">${body}</div>
      ${
        cta
          ? `<p style="margin:28px 0"><a href="${cta.url}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${cta.label}</a></p>
             <p style="margin:0;font-size:13px;color:#71717a">Se il pulsante non funziona, copia questo indirizzo nel browser:<br><span style="word-break:break-all">${cta.url}</span></p>`
          : ""
      }
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#71717a;text-align:center">
    ${SITE.name} · ${siteUrl()}
  </p>
</body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${siteUrl()}/verifica-email?token=${token}`;
  await send({
    to,
    subject: "Conferma il tuo indirizzo email",
    text: `Ciao ${name},\n\nconferma il tuo indirizzo per attivare l'account Vybes:\n${url}\n\nIl link scade tra 24 ore.`,
    html: layout(
      `Ciao ${name}, confermi la tua email?`,
      `<p>Ti manca un passo per attivare l'account. Il link scade tra 24 ore.</p>`,
      { label: "Conferma l'email", url }
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${siteUrl()}/reimposta-password?token=${token}`;
  await send({
    to,
    subject: "Reimposta la tua password",
    text: `Ciao ${name},\n\nper scegliere una nuova password apri questo link:\n${url}\n\nIl link scade tra 1 ora. Se non hai richiesto tu il reset, ignora questa email.`,
    html: layout(
      "Reimposta la tua password",
      `<p>Hai chiesto di cambiare la password. Il link scade tra un'ora.</p>
       <p>Se non sei stato tu, ignora questa email: la password resta quella di prima.</p>`,
      { label: "Scegli una nuova password", url }
    ),
  });
}

/**
 * Riscontro a chi ha segnalato un contenuto.
 *
 * Il Digital Services Act chiede che la decisione su una segnalazione sia
 * comunicata a chi l'ha inviata, con la motivazione. Non basta averla presa:
 * senza comunicazione, chi ha segnalato non ha modo di sapere se il sistema
 * funziona, e la norma parla esplicitamente di trattamento «non arbitrario».
 *
 * Va anche detto che la decisione si può contestare: è l'altra metà
 * dell'obbligo, e senza un indirizzo a cui rispondere resterebbe teorica.
 */
export async function sendReportDecisionEmail(
  to: string,
  esito: "accolta" | "respinta",
  motivazione: string
) {
  const titolo = `La tua segnalazione è stata ${esito}`;
  await send({
    to,
    subject: `${titolo} — ${SITE.name}`,
    text:
      `Abbiamo esaminato la segnalazione che ci hai inviato.\n\n` +
      `Esito: ${esito}\n\nMotivazione:\n${motivazione}\n\n` +
      `Se ritieni che la decisione sia sbagliata, rispondi a questa email.`,
    html: layout(
      titolo,
      `<p>Abbiamo esaminato la segnalazione che ci hai inviato.</p>
       <p><strong>Motivazione</strong><br>${escapeHtml(motivazione)}</p>
       <p>Se ritieni che la decisione sia sbagliata, rispondi a questa email: la
       rivediamo.</p>`
    ),
  });
}

/**
 * La motivazione è testo scritto da una persona e finisce dentro dell'HTML.
 * Chi modera è affidabile, ma «affidabile» non è una garanzia tecnica: basta
 * un apice o un minore per rompere il messaggio, e un tag per fare peggio.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
