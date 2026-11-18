/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"] },
      colors: {
        brand: { DEFAULT: "#0E7C66", dark: "#0A5E4E", soft: "#E6F4F0" },
        ink: { DEFAULT: "#101828", 2: "#344054", 3: "#475467", muted: "#5D6679" },
        line: { DEFAULT: "#E4E7EC", strong: "#D0D5DD" },
        canvas: "#F5F6F8",
        warn: { DEFAULT: "#A15C07", soft: "#FEF3E2" },
        danger: { DEFAULT: "#B42318", soft: "#FEF3F2" },
        indigo: { DEFAULT: "#4338CA", soft: "#EEF2FF" },
      },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
};
