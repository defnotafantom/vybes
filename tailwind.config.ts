import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identità: viola. Resta la tinta principale del marchio.
        brand: {
          50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
          400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
          800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065",
        },
        // Accento: ciano elettrico. Serve al contrasto — su fondo scuro il
        // viola da solo si appiattisce, e senza una seconda tinta ogni
        // elemento interattivo sembra uguale agli altri.
        accent: {
          50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9",
          400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490",
          800: "#155e75", 900: "#164e63", 950: "#083344",
        },
        // Oro: riservato al compenso. Un colore che significa una cosa sola
        // si legge senza doverlo spiegare.
        gold: { 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },

        // Esiti: verde per un sì, ambra per un'attesa. Sono tinte separate da
        // `gold` proprio per non intaccarne la regola — l'oro significa
        // compenso e basta, e riusarlo per «in attesa» costerebbe quella
        // chiarezza in cambio di due valori esadecimali risparmiati.
        //
        // Manca volutamente un rosso. Un «no» a una candidatura non è un
        // errore né un pericolo: colorarlo di rosso in un elenco che si
        // guarda ogni giorno lo farebbe sembrare più grave di quanto sia.
        // I rifiuti restano neutri e spenti, che è come vanno letti.
        // I valori stanno in globals.css perché cambiano con il tema, come
        // tutte le altre superfici: qui ci sono solo i nomi.
        esito: {
          ok: "rgb(var(--esito-ok-testo) / <alpha-value>)",
          "ok-tinta": "rgb(var(--esito-ok-tinta) / <alpha-value>)",
          attesa: "rgb(var(--esito-attesa-testo) / <alpha-value>)",
          "attesa-tinta": "rgb(var(--esito-attesa-tinta) / <alpha-value>)",
        },

        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        "surface-sunken": "rgb(var(--surface-sunken) / <alpha-value>)",
        ink: "rgb(var(--fg) / <alpha-value>)",
        "ink-muted": "rgb(var(--muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        "line-strong": "rgb(var(--border-strong) / <alpha-value>)",
      },

      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },

      /**
       * Scala tipografica fluida.
       *
       * clamp(minimo, preferito, massimo): la dimensione cresce con la
       * larghezza della finestra senza scatti ai breakpoint. Un titolo che su
       * telefono è 48px e su desktop 104px passa per tutti i valori
       * intermedi, invece di saltare.
       *
       * Il valore preferito combina rem e vw: la parte in rem garantisce che
       * lo zoom del browser continui a funzionare, requisito di accessibilità
       * che una scala basata solo su vw romperebbe.
       */
      fontSize: {
        "fluid-xs": ["clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)", { lineHeight: "1.5" }],
        "fluid-sm": ["clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)", { lineHeight: "1.55" }],
        "fluid-base": ["clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)", { lineHeight: "1.65" }],
        "fluid-lg": ["clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)", { lineHeight: "1.5" }],
        "fluid-xl": ["clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)", { lineHeight: "1.35" }],
        "fluid-2xl": ["clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "fluid-3xl": ["clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "fluid-4xl": ["clamp(2.75rem, 1.8rem + 4.5vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.04em" }],
        "fluid-hero": ["clamp(3rem, 1.5rem + 6.5vw, 6.5rem)", { lineHeight: "0.98", letterSpacing: "-0.045em" }],
      },

      borderRadius: { xl: "0.875rem", "2xl": "1.125rem", "3xl": "1.5rem", "4xl": "2rem" },

      boxShadow: {
        subtle: "0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)",
        raised: "0 2px 4px rgb(0 0 0 / 0.04), 0 6px 16px rgb(0 0 0 / 0.08)",
        float: "0 4px 8px rgb(0 0 0 / 0.06), 0 16px 32px rgb(0 0 0 / 0.12)",
        // Sul tema scuro le ombre sono invisibili: la profondità si ottiene
        // con un bordo luminoso in alto, che simula una luce dall'alto.
        "dark-subtle": "inset 0 1px 0 rgb(255 255 255 / 0.04)",
        "dark-raised": "inset 0 1px 0 rgb(255 255 255 / 0.06), 0 8px 24px rgb(0 0 0 / 0.4)",
        "dark-float": "inset 0 1px 0 rgb(255 255 255 / 0.08), 0 16px 48px rgb(0 0 0 / 0.6)",
        "glow-brand": "0 0 0 1px rgb(139 92 246 / 0.3), 0 8px 32px rgb(139 92 246 / 0.25)",
        "glow-accent": "0 0 0 1px rgb(34 211 238 / 0.3), 0 8px 32px rgb(34 211 238 / 0.2)",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: { 250: "250ms", 400: "400ms", 600: "600ms" },

      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        // Deriva lentissima dei gradienti dell'hero: dà vita allo sfondo
        // senza che l'occhio percepisca un movimento.
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(3%, -2%) scale(1.05)" },
          "66%": { transform: "translate(-2%, 2%) scale(0.97)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-down": "fade-down 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-in-right": "slide-in-right 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.8s infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        drift: "drift 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;