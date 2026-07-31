import Link from "next/link";
import { Fragment } from "react";

/**
 * Rende cliccabili menzioni, hashtag e link dentro il testo dei post.
 *
 * Due precauzioni che vale la pena notare:
 *
 * 1. Il testo NON viene passato a `dangerouslySetInnerHTML`. Si spezza con
 *    una regex e si ricostruisce con nodi React: qualsiasi cosa l'utente
 *    scriva finisce come testo, mai come markup. È la differenza fra un post
 *    e una falla XSS.
 * 2. I link esterni portano `rel="nofollow ugc noopener"`. `ugc` dice a
 *    Google che è contenuto generato dagli utenti e `nofollow` evita che il
 *    sito diventi un bersaglio per lo spam di link, che è la prima cosa che
 *    succede a una piattaforma aperta appena viene indicizzata.
 */
const PATTERN = /(@[\p{L}\p{N}_-]+|#[\p{L}\p{N}_-]+|https?:\/\/[^\s<]+)/gu;

export function RichText({ text }: { text: string }) {
  const parts = text.split(PATTERN);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part.startsWith("@")) {
          return (
            <Link
              key={i}
              href={`/cerca?q=${encodeURIComponent(part.slice(1))}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/cerca?q=${encodeURIComponent(tag)}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith("http")) {
          let label = part;
          try {
            const url = new URL(part);
            // Si mostra il dominio, non l'URL intero: una stringa di 200
            // caratteri manda a capo il post e non dice niente di utile.
            label = url.hostname.replace(/^www\./, "") + (url.pathname !== "/" ? "/…" : "");
          } catch {
            /* URL malformato: si mostra così com'è */
          }
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              {label}
            </a>
          );
        }

        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
