import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#f8fafc",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#1e40af",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#64748b",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#ca8a04",
          foreground: "#ffffff",
        },
        error: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        surface: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "#f8fafc",
          foreground: "#0f172a",
          primary: "#1e40af",
          "primary-foreground": "#ffffff",
          accent: "#f1f5f9",
          "accent-foreground": "#0f172a",
          border: "#e2e8f0",
          ring: "#1e40af",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
      spacing: {
        "4xs": "2px",
        "3xs": "4px",
        "2xs": "8px",
        xs: "12px",
        sm: "16px",
        md: "20px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
        "3xl": "48px",
        "4xl": "64px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        sm: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        base: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        lg: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "600" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
