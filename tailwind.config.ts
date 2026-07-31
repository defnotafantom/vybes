import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Scala completa fino a 950: senza, le classi dark:*-950 non
        // esistono e vengono ignorate in silenzio.
        brand: {
          25: "#fbfaff",
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        // Superfici e bordi guidati dalle variabili CSS: cambiano da soli
        // in tema scuro senza raddoppiare ogni classe con dark:.
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        ink: "rgb(var(--fg) / <alpha-value>)",
        "ink-muted": "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem", "3xl": "1.5rem" },
      boxShadow: {
        // Ombre a due strati: una stretta per il contatto, una diffusa per
        // la profondità. Una sola ombra risulta sempre piatta o sporca.
        subtle: "0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)",
        raised: "0 2px 4px rgb(0 0 0 / 0.04), 0 6px 16px rgb(0 0 0 / 0.08)",
        float: "0 4px 8px rgb(0 0 0 / 0.06), 0 16px 32px rgb(0 0 0 / 0.12)",
        glow: "0 0 0 1px rgb(124 58 237 / 0.2), 0 8px 24px rgb(124 58 237 / 0.18)",
      },
      transitionTimingFunction: {
        // Curva con leggero overshoot: dà solidità ai movimenti brevi.
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: { 250: "250ms", 400: "400ms" },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-down": "fade-down 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-right": "slide-in-right 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
