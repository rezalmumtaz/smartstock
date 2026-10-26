/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        kwarto: {
          paper: "#FDFBF7",
          line: "#E2E8F0",
          ledgerGreen: "#15803D",
          ledgerRed: "#B91C1C",
          binder: "#1E293B",
          tabActive: "#2563EB",
          tabInactive: "#F1F5F9",
        },
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
