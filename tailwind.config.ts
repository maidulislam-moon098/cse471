import type { Config } from "tailwindcss"
const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#080a0f", // Darker background
        foreground: "#ffffff",
        primary: "#3b82f6", // Changed from purple to blue
        "primary-hover": "#2563eb", // Darker blue for hover states
        card: "#111827", // Darker card background
        "error-bg": "rgba(127, 29, 29, 0.4)",
        "error-border": "#7f1d1d",
      },
      borderRadius: {
        lg: "1rem", // Increased border radius
        md: "0.75rem", // Increased border radius
        sm: "0.5rem", // Increased border radius
      },
      spacing: {
        sidebar: "280px", // Wider sidebar for more spacing
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
