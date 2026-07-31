"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  body: string;
  entityUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data.items);
      setUnread(json.data.unread);
    } catch {
      /* offline: si riprova al prossimo intervallo */
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-ghost relative"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifiche${unread > 0 ? `, ${unread} non lette` : ""}`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 max-h-96 w-80 origin-top-right animate-scale-in overflow-y-auto rounded-2xl border p-2 shadow-float"
          style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))" }}
        >
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold">Notifiche</p>
            {unread > 0 && (
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={markAllRead}>
                Segna tutte come lette
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm muted">Nessuna notifica</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.entityUrl ?? "/dashboard"}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-2 py-2 text-sm hover:bg-brand-50 dark:hover:bg-white/5 ${
                      n.readAt ? "muted" : "font-medium"
                    }`}
                  >
                    {n.body}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
