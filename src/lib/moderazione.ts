import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

/**
 * Verifica dei poteri di moderazione.
 *
 * Il ruolo non sta nella sessione, e non è una dimenticanza. La sessione è un
 * JWT firmato: il suo contenuto resta valido fino alla scadenza, quindi un
 * ruolo revocato continuerebbe a funzionare per ore. Per un dato che descrive
 * *cosa puoi fare* è il compromesso sbagliato — una revoca deve avere effetto
 * subito, e il costo è una lettura su chiave primaria.
 *
 * Vale il contrario per `role` (artista o organizzatore), che sta nel token:
 * cambia di rado e non concede poteri su contenuti altrui.
 *
 * `server-only` fa fallire la compilazione se questo modulo finisce per errore
 * in un componente client: porterebbe con sé il client Prisma, e con lui la
 * stringa di connessione al database.
 */
export async function ruoloModerazione(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { adminRole: true },
  });
  return u?.adminRole ?? "NONE";
}

/** Scorciatoia: l'utente ha questo permesso? */
export async function puo(userId: string, permesso: Permission): Promise<boolean> {
  return hasPermission(await ruoloModerazione(userId), permesso);
}
