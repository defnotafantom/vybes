"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type Tab = { id: string; label: string; badge?: number; content: React.ReactNode };

/**
 * Tab accessibili: navigazione con le frecce e `aria-controls` corretti,
 * come prevede il pattern WAI-ARIA. Un tab implementato con dei semplici
 * bottoni è invisibile a chi usa uno screen reader.
 */
export function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const uid = useId();
  const [active, setActive] = useState(initial ?? tabs[0]?.id);

  function onKeyDown(e: React.KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === active);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive(tabs[(index + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive(tabs[(index - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(tabs[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(tabs[tabs.length - 1].id);
    }
  }

  return (
    <div>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b pb-px"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
                selected ? "text-brand-600" : "text-ink-muted hover:text-ink"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
              {selected && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="animate-fade-in pt-6"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </div>
  );
}
