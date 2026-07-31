"use client";

import { Component, type ReactNode } from "react";

/**
 * Confine d'errore per i componenti client.
 *
 * `app/error.tsx` intercetta gli errori di rendering di una rotta intera:
 * questo serve a isolare un singolo pezzo di interfaccia, così una mappa o
 * un widget che esplode non porta giù la pagina attorno.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; label?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error(`[error-boundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <div className="card text-sm">
          <p className="font-medium">Questa sezione non si è caricata.</p>
          <button
            type="button"
            className="mt-2 text-brand-600 underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Riprova
          </button>
        </div>
      )
    );
  }
}
