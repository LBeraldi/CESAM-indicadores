import type { Config } from "tailwindcss";

// Os valores vivem como variáveis CSS em app/globals.css (fonte única dos
// tokens, ver docs/design-refactor/01-spec-design-system.md). Os nomes ms-*
// foram mantidos para não quebrar classes em uso.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ms: {
          bg: "var(--color-bg)",
          ink: "var(--color-ink)",
          muted: "var(--color-muted)",
          placeholder: "var(--color-placeholder)",
          line: "var(--color-line)",
          "line-strong": "var(--color-line-strong)",
          surface: "var(--color-surface)",
          "surface-muted": "var(--color-surface-muted)",
          sky: "var(--color-action-subtle)",
          blue: "var(--color-action)",
          navy: "var(--color-navy)",
          green: "var(--color-brand-green)"
        },
        dim: {
          agua: "var(--dim-agua)",
          esgoto: "var(--dim-esgoto)",
          residuos: "var(--dim-residuos)",
          pluviais: "var(--dim-pluviais)",
          gestao: "var(--dim-gestao)"
        },
        sem: {
          positive: "var(--sem-positive)",
          "positive-bg": "var(--sem-positive-bg)",
          warning: "var(--sem-warning)",
          "warning-bg": "var(--sem-warning-bg)",
          negative: "var(--sem-negative)",
          "negative-bg": "var(--sem-negative-bg)",
          info: "var(--sem-info)",
          "info-bg": "var(--sem-info-bg)",
          neutral: "var(--sem-neutral)",
          "neutral-bg": "var(--sem-neutral-bg)"
        },
        seq: {
          1: "var(--seq-1)",
          2: "var(--seq-2)",
          3: "var(--seq-3)",
          4: "var(--seq-4)",
          5: "var(--seq-5)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)"
      }
    }
  },
  plugins: []
};

export default config;
