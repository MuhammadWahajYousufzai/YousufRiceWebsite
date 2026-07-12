/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F7F7FC",
          100: "#EFEFF9",
          200: "#DCDDF2",
          500: "#7A7EC4",
          600: "#5A5DA8",
          700: "#423F8C",
          800: "#27247B",
          900: "#1A1854",
        },
        gold: {
          50: "#FBF8F0",
          100: "#F6EDD7",
          400: "#D4AD54",
          600: "#96762E",
          700: "#735A23",
        },
        coral: {
          50: "#FEEEEF",
          100: "#FCD4D7",
          500: "#E63946",
          700: "#9C1F29",
        },
        ink: "#1D1E28",
        body: "#565869",
        muted: "#7B7D8F",
        line: "#E6E6ED",
        canvas: "#FAFAFC",
        wash: "#F3F3F7",
      },
      borderRadius: {
        card: "20px",
        button: "24px",
      },
    },
  },
  plugins: [],
};
