/**
 * Bus di eventi in-process per la chat.
 *
 * Perché non Socket.io: su Next in App Router (e su qualsiasi deploy
 * serverless) non esiste un server HTTP persistente a cui agganciarlo senza un
 * custom server. Server-Sent Events passa dalle route handler standard,
 * riconnette da solo e per una chat (server -> client, invio via POST) basta.
 *
 * ATTENZIONE al perimetro di questo bus: copre solo il processo corrente. Su
 * Vercel chi scrive e chi ascolta finiscono quasi sempre su istanze diverse,
 * quindi da solo non consegnerebbe niente.
 *
 * La consegna cross-istanza NON è affidata a questo bus ma al tailing del
 * database dentro lo stream SSE (vedi
 * `app/api/messages/[conversationId]/stream/route.ts`). Il bus resta perché
 * quando mittente e destinatario capitano sulla stessa istanza il messaggio
 * arriva subito invece che entro due secondi.
 *
 * Redis pub/sub qui non aiuterebbe: servirebbe comunque una connessione
 * persistente per istanza, e il database — che è già la fonte di verità —
 * risolve lo stesso problema senza aggiungere un servizio.
 */
type Listener = (payload: unknown) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(channel: string, listener: Listener): () => void {
  const set = channels.get(channel) ?? new Set<Listener>();
  set.add(listener);
  channels.set(channel, set);

  return () => {
    set.delete(listener);
    if (set.size === 0) channels.delete(channel);
  };
}

export function publish(channel: string, payload: unknown): void {
  const set = channels.get(channel);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch (e) {
      console.error("[realtime] listener fallito", e);
    }
  }
}

export const conversationChannel = (id: string) => `conversation:${id}`;
export const userChannel = (id: string) => `user:${id}`;
