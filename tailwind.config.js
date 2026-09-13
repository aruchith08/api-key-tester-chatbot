/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090A",
        surface: "#121214",
        "surface-hover": "#18181B",
        border: "#232326",
        "border-subtle": "#1C1C1F",
        accent: "#10B981",
        "muted-text": "#71717A",
        "primary-text": "#EDEDED",
      },
      fontFamily: {
        editorial: ["'Instrument Serif'", "'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      boxShadow: {
        'soft-glow': '0 0 30px -10px rgba(255, 255, 255, 0.05)',
        'modal': '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.07)',
      }
    },
  },
  plugins: [],
}
