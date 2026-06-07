import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        drift: {
          bg: "#0a0a0f",
          card: "#12121a",
          border: "#1e1e2e",
          purple: "#7c3aed",
          "purple-light": "#a78bfa",
          green: "#22c55e",
          orange: "#f59e0b",
          red: "#ef4444",
          muted: "#94a3b8",
          "card-hover": "#1a1a26",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-purple":
          "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
        "gradient-hero":
          "radial-gradient(ellipse at top left, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(59,130,246,0.1) 0%, transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 58, 237, 0.15)",
        "glow-sm": "0 0 20px rgba(124, 58, 237, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
