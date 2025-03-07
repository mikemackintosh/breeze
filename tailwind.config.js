// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Direct color definitions instead of HSL variables
        background: "#111827",
        foreground: "#f3f4f6",

        muted: "#1f2937",
        "muted-foreground": "#6b7280",

        accent: "#1f2937",
        "accent-foreground": "#ffffff",

        popover: "#111827",
        "popover-foreground": "#f3f4f6",

        primary: {
          DEFAULT: "#8b5cf6",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#1f2937",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        // Slate color variants for explicit use
        slate: {
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Relationship colors
        relationship: {
          family: "#3b82f6", // Blue
          friend: "#10b981", // Green
          rival: "#f59e0b", // Amber
          enemy: "#ef4444", // Red
          lover: "#e91e63", // Pink
          mentor: "#9c27b0", // Purple
          colleague: "#607d8b", // Blue-grey
        },
        // Location types
        location: {
          city: "#14b8a6", // Teal
          wilderness: "#10b981", // Green
          landmark: "#f59e0b", // Amber
          building: "#64748b", // Slate
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Open Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
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
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
