import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
} satisfies Config;
