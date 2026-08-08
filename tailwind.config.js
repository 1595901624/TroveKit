/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        content1: "rgb(var(--content-1) / <alpha-value>)",
        divider: "rgb(var(--divider) / <alpha-value>)",
        default: {
          50: "rgb(var(--default-50) / <alpha-value>)",
          100: "rgb(var(--default-100) / <alpha-value>)",
          200: "rgb(var(--default-200) / <alpha-value>)",
          300: "rgb(var(--default-300) / <alpha-value>)",
          400: "rgb(var(--default-400) / <alpha-value>)",
          500: "rgb(var(--default-500) / <alpha-value>)",
          600: "rgb(var(--default-600) / <alpha-value>)",
          700: "rgb(var(--default-700) / <alpha-value>)",
          DEFAULT: "rgb(var(--default-100) / <alpha-value>)",
        },
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", foreground: "rgb(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "rgb(var(--secondary) / <alpha-value>)", foreground: "rgb(var(--secondary-foreground) / <alpha-value>)" },
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontSize: {
        tiny: ["0.75rem", "1rem"],
        small: ["0.875rem", "1.25rem"],
        medium: ["1rem", "1.5rem"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
}
