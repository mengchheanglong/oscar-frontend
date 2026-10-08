import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        codex: {
          navy: "#161927",
          bg: "#F4F5F7",
          card: "#FFFFFF",
          accent: "#4361EE",
          hover: "#6C82F8",
          highlight: "#E09F3E",
          warning: "#C94A29",
          green: "#2D8A60",
          text: "#111827",
          muted: "#6B7280",
          border: "#E5E7EB",
          lightBlue: "#EDF2FF",
          lightGreen: "#E8F5E9",
          lightOrange: "#FEF3C7",
          lightRed: "#FEE2E2",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
      animation: {
        meteor: "meteor 5s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        beam: "beam 3s linear infinite",
      },
      keyframes: {
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        beam: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
