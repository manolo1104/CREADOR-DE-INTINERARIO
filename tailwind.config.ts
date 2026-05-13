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
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "serif"],
        dm: ["var(--font-dm-sans)", "sans-serif"],
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
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out forwards",
        shrink:     "shrink linear forwards",
      },
    },
  },
  plugins: [typography],
};
export default config;
