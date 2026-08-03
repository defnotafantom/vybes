"use client";

import { useEffect, useRef, useState } from "react";
import { conta } from "@/lib/testo";

export type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { slug: string; name: string; image: string | null };
};

/**
 * Chat in tempo reale su Server-Sent Events.
 * Il browser gestisce da solo la riconnessione; se lo stream cade
 * definitivamente si ricade su un polling di sicurezza ogni 15s.
 */
export function ChatRoom({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource(`/api/messages/${conversationId}/stream`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type !== "message") return;
      setMessages((prev) =>
        prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
      );
    };

    return () => source.close();
  }, [conversationId]);

  // Rete di sicurezza: se lo stream è giù, si recupera comunque.
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data);
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [connected, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setDraft("");
    const res = await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === json.data.id) ? prev : [...prev, json.data]));
    } else {
      setDraft(content); // ripristina la bozza se l'invio fallisce
    }
    setSending(false);
  }

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs muted" style={{ borderColor: "rgb(var(--border))" }}>
        <span>{conta(messages.length, "messaggio", "messaggi")}</span>
        <span aria-live="polite" className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "animate-pulse-soft bg-green-500" : "bg-ink-muted"
            }`}
          />
          {connected ? "in tempo reale" : "riconnessione…"}
        </span>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[75%] animate-fade-up rounded-2xl px-4 py-2 text-sm shadow-subtle ${
                  mine ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {!mine && <p className="text-xs font-medium opacity-70">{m.sender.name}</p>}
                <p className="whitespace-pre-line">{m.content}</p>
                <time dateTime={m.createdAt} className="mt-1 block text-[10px] opacity-60">
                  {new Date(m.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t p-3" style={{ borderColor: "rgb(var(--border))" }}>
        <label htmlFor="chat-input" className="sr-only">Scrivi un messaggio</label>
        <input
          id="chat-input"
          className="input"
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Scrivi un messaggio…"
        />
        <button type="submit" className="btn-primary" disabled={sending || !draft.trim()}>
          Invia
        </button>
      </form>
    </div>
  );
}
