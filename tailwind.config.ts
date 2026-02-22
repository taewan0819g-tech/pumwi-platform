import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8E86F5",
          dark: "#7B73E5",
          light: "#A59FF7",
        },
        luxury: {
          black: "#0a0a0a",
          charcoal: "#141414",
          gold: "#b8a070",
          "gold-muted": "#8b7355",
        },
        "login-bg": "#0A0A0B",
        "off-white": "#F3F4F6",
        "deep-green": "#2D5A27",
        brand: {
          purple: "#8E86F5",
          green: "#2F5D50",
        },
        "glow-purple": "#8B5CF6",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      keyframes: {
        "blink-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "blink-subtle": "blink-subtle 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
      },
      boxShadow: {
        "glow-purple": "0 0 24px rgba(139, 92, 246, 0.35), 0 0 48px rgba(139, 92, 246, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
