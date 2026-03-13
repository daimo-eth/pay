const path = require("path");

module.exports = {
  content: [path.join(__dirname, "content.html")],
  corePlugins: { preflight: false },
  important: true,
  theme: {
    extend: {
      borderRadius: {
        lg: "0.625rem",
      },
      fontSize: {
        sm: ["0.8125rem", { lineHeight: "1.125rem" }],
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      maxWidth: {
        xs: "19rem",
      },
      spacing: {
        4: "0.9375rem",
        6: "1.625rem",
      },
    },
  },
};
