import type { Config } from "tailwindcss";

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
          bg: "#f4f7fb",
          ink: "#102033",
          muted: "#5b6878",
          line: "#d8e1eb",
          surface: "#ffffff",
          sky: "#e7f0f8",
          blue: "#1f5f9f",
          navy: "#0c2d57",
          green: "#18765a",
          teal: "#0f766e",
          amber: "#b7791f",
          terra: "#b4552b"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(16, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
