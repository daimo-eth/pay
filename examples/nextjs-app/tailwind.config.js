/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          light: "#95CE96",
          medium: "#66B95F",
          dark: "#14AC2B",
          darker: "#009110",
          DEFAULT: "#14AC2B",
        },
        primary: {
          0: "#b3b3b3",
          50: "#999999",
          100: "#808080",
          200: "#737373",
          300: "#666666",
          400: "#525252",
          500: "#333333",
          600: "#292929",
          700: "#1f1f1f",
          800: "#0d0d0d",
          900: "#0a0a0a",
          950: "#080808",
          light: "#b3b3b3",
          medium: "#999999",
          dark: "#333333",
          darker: "#1f1f1f",
          DEFAULT: "#333333",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        "up-down": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-in-out forwards",
        "up-down-slow": "up-down 8s ease-in-out infinite",
        "up-down-medium": "up-down 6s ease-in-out infinite",
      },
    },
  },
  darkMode: "false",
  plugins: [],
};
