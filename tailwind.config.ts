import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#4f6df5",
          600: "#3b56d6",
          700: "#2f44ad",
        },
      },
    },
  },
  plugins: [],
};

export default config;
