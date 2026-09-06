import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Spec-defined theme colors
        // bg-slate-950 as primary background (Tailwind built-in, #020617)
        // Emerald green for bid/supply (#10b981)
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // Primary bid/supply color
          600: "#059669", // AMM bid highlight
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        // Rose red for ask/demand (#e11d48)
        rose: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48", // Primary ask/demand color
          700: "#be123c", // AMM ask highlight
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519",
        },
        // Legacy panel/border colors kept for backward compatibility with existing components
        background: "#020617", // slate-950
        panel: "rgba(15, 23, 42, 0.6)", // slate-900 translucent
        border: "rgba(51, 65, 85, 0.8)", // slate-700 translucent
        textMain: "#f1f5f9", // slate-100
        textMuted: "#94a3b8", // slate-400
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "Outfit", "sans-serif"],
        mono: [
          "var(--font-jetbrains)",
          "JetBrains Mono",
          "Fira Code",
          "Fira Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-emerald": "0 0 15px rgba(16, 185, 129, 0.3)",
        "glow-rose": "0 0 15px rgba(225, 29, 72, 0.3)",
        panel: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
        // Legacy glow shadows
        "glow-accent": "0 0 15px rgba(0, 229, 255, 0.3)",
        "glow-success": "0 0 15px rgba(0, 255, 102, 0.3)",
        "glow-danger": "0 0 15px rgba(255, 0, 85, 0.3)",
      },
      animation: {
        "flash-green": "flashGreen 0.5s ease-out",
        "flash-red": "flashRed 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(16, 185, 129, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(225, 29, 72, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      spacing: {
        navbar: "64px", // Fixed navbar height
        ticker: "52px", // Ticker tape height
      },
      minHeight: {
        carousel: "400px",
      },
      borderRadius: {
        card: "0.5rem", // Consistent card border radius (8px)
      },
    },
  },
  plugins: [],
};

export default config;
