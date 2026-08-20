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
          50: "#FFFFF2",
          100: "#FFFFC7",
          400: "#FFFF03",
          600: "#B8A900",
          700: "#746A00",
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
        canvas: "#F9FAFB",
        wash: "#F3F4F6",
      },
      borderRadius: {
        card: "12px",
        button: "24px",
      },
    },
  },
  plugins: [],
};
