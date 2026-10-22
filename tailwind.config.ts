import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        codex: {
          navy: "var(--ws-sidebar)",
          bg: "var(--ws-bg)",
          card: "var(--ws-surface)",
          accent: "var(--ws-text)",
          hover: "var(--ws-muted)",
          highlight: "#E09F3E",
          warning: "#C94A29",
          green: "#2D8A60",
          text: "var(--ws-text)",
          muted: "var(--ws-muted)",
          border: "var(--ws-border)",
          lightBlue: "#EDF2FF",
          lightGreen: "#E8F5E9",
          lightOrange: "#FEF3C7",
          lightRed: "#FEE2E2",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
