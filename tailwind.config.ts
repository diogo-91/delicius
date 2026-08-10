import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E7EB",
        surface: "#F5F7FA",
        orange: "#7b3f2a",
        brand: {
          50: "#fbf0ea",
          100: "#efd4c6",
          500: "#9a5a3c",
          600: "#7b3f2a",
          700: "#4f2618"
        },
        navy: {
          50: "#edf5ff",
          500: "#0b315f",
          700: "#061f3f",
          900: "#03152d"
        },
        cta: {
          DEFAULT: "#B3261E",
          hover: "#8F1D2C",
          pressed: "#7A2E1C"
        },
        gold: "#D4A72C",
        paper: "#FFF8EF",
        ink2: "#3A1F16",
        muted2: "#75645D",
        line2: "#EADFD8"
      },
      fontFamily: {
        display: ["var(--font-display)"]
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        soft: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        elevate: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "elevate-lg": "0 4px 12px 0 rgba(0, 0, 0, 0.05)",
        card: "0 2px 10px rgba(15, 23, 42, 0.08)",
        "card-hover": "0 10px 24px rgba(15, 23, 42, 0.12)"
      },
      borderRadius: {
        card: "12px",
        control: "12px"
      }
    }
  },
  plugins: []
};

export default config;
