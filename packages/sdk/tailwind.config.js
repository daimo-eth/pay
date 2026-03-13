/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/web/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  prefix: "daimo-",
  theme: {
    extend: {
      animation: {
        "daimo-pulse": "daimo-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "daimo-pulse": {
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
