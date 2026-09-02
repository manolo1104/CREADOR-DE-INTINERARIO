import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        negro: "#0e1710",
        "verde-profundo": "#1a2e1a",
        "verde-bosque": "#243d20",
        "verde-selva": "#3a6b1a",
        "verde-vivo": "#5a9e2a",
        lima: "#8fbe3a",
        crema: "#f4edd8",
        arena: "#e6d4b0",
        dorado: "#c4882a",
        terracota: "#9a4a1e",
        agua: "#3a8aaa",

        // ── Piel del funnel del curso (/curso) ──────────────────────────
        // Negro con sesgo frío (nunca #000, que aplana), blanco roto y un
        // solo azul eléctrico. El azul de BOTÓN lleva texto tinta encima
        // (6.9:1); el azul de TEXTO sobre negro es el claro (7.5:1).
        tinta: "#07090C",
        "tinta-2": "#0D1117",
        "tinta-3": "#141B24",
        linea: "#1F2A37",
        "linea-2": "#2C3A4B",
        hielo: "#F2F6FC",
        "hielo-2": "#9FB0C6",
        "hielo-3": "#64748B",
        azul: "#3B8CFF",
        "azul-vivo": "#63A6FF",
        "azul-humo": "#12233F",
        // Para los bloques BLANCOS que rompen el negro. El azul de la piel
        // oscura (#63A6FF) sobre blanco da 2.3:1 y reprueba: sobre claro se
        // usa este, que da 6.6:1.
        blanco: "#FFFFFF",
        "azul-hondo": "#0F56E0",
        "linea-clara": "#DCE3EC",
        grafito: "#3A4655",
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        dm: ["var(--font-dm-sans)", "sans-serif"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "slide-up": {
          "0%":   { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        shrink: {
          "0%":   { width: "100%" },
          "100%": { width: "0%" },
        },
        "price-bump": {
          "0%":   { transform: "scale(1)" },
          "40%":  { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        "date-pop": {
          "0%":   { transform: "scale(0.88)", opacity: "0.4" },
          "60%":  { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":      { transform: "translateX(-6px)" },
          "40%":      { transform: "translateX(6px)" },
          "60%":      { transform: "translateX(-4px)" },
          "80%":      { transform: "translateX(4px)" },
        },
      },
      animation: {
        "slide-up":   "slide-up 0.25s ease-out forwards",
        shrink:       "shrink linear forwards",
        "price-bump": "price-bump 180ms cubic-bezier(0.34,1.56,0.64,1)",
        "date-pop":   "date-pop 220ms cubic-bezier(0.34,1.56,0.64,1)",
        shake:        "shake 280ms cubic-bezier(0.23,1,0.32,1)",
      },
      transitionTimingFunction: {
        "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        "snappy":     "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [typography],
};
export default config;
