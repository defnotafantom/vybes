import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output as ZodOutput } from "zod";
import { auth } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

/**
 * Valida il body JSON restituendo errori campo per campo.
 * Il generico e' legato allo schema (non al tipo di output) cosi' i campi
 * con `.default()` risultano valorizzati, non opzionali, dopo il parse.
 */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S) {
  try {
    const json = await req.json();
    return { data: schema.parse(json) as ZodOutput<S>, error: null as null };
  } catch (e) {
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of e.errors) fields[issue.path.join(".") || "_"] = issue.message;
      return { data: null, error: fail("Dati non validi", 422, fields) };
    }
    return { data: null, error: fail("JSON non valido", 400) };
  }
}

/** Guardia riusabile: sessione + rate limit in una riga. */
export async function guard(
  req: Request,
  opts: { scope: string; limit?: number; requireAuth?: boolean } 
) {
  const rl = await rateLimit(clientKey(req, opts.scope), opts.limit ?? 30);
  if (!rl.ok) {
    return {
      user: null,
      error: NextResponse.json(
        { ok: false, error: "Troppe richieste, riprova tra poco" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      ),
    };
  }

  if (opts.requireAuth === false) return { user: null, error: null };

  const session = await auth();
  if (!session?.user?.id) return { user: null, error: fail("Non autenticato", 401) };
  return { user: session.user, error: null };
}

/** Wrapper che trasforma eccezioni impreviste in 500 senza far trapelare stack. */
export async function handle<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (e) {
    console.error("[api]", e);
    return fail("Errore interno del server", 500);
  }
}
