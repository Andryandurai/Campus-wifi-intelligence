/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#0f172a",
        background: "#ffffff",
        foreground: "#09090b",
        muted: {
          DEFAULT: "#f8fafc",
          foreground: "#64748b",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#09090b",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#09090b",
        },
        primary: {
          DEFAULT: "#0f172a",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        accent: {
          DEFAULT: "#f8fafc",
          foreground: "#0f172a",
        },
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevation': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}

