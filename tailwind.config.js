/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { display: ["Bricolage Grotesque", "sans-serif"], sans: ["Inter", "system-ui", "sans-serif"] },
      colors: { banana: { 400: "#FFD43B", 500: "#F5C400" } },
    },
  },
  plugins: [],
};
