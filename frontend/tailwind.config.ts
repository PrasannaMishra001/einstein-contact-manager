import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          yellow: "#FCD34D",
          pink: "#F472B6",
          cyan: "#22D3EE",
          orange: "#FB923C",
          purple: "#A78BFA",
          green: "#4ADE80",
          red: "#F87171",
          cream: "#FAFAF0",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        full: "9999px",
      },
      boxShadow: {
        neo: "4px 4px 0px 0px rgba(0,0,0,1)",
        "neo-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        "neo-lg": "6px 6px 0px 0px rgba(0,0,0,1)",
        "neo-xl": "8px 8px 0px 0px rgba(0,0,0,1)",
        "neo-hover": "0px 0px 0px 0px rgba(0,0,0,1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["Courier New", "monospace"],
      },
      keyframes: {
        "slide-in": { from: { transform: "translateY(-8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "slide-up": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        shimmer: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        wiggle: { "0%,100%": { transform: "rotate(-3deg)" }, "50%": { transform: "rotate(3deg)" } },
      },
      animation: {
        "slide-in": "slide-in 0.15s ease-out",
        "slide-up": "slide-up 0.15s ease-out",
        shimmer: "shimmer 1.5s infinite",
        wiggle: "wiggle 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
