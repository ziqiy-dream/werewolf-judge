/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#0d0c0b", // Even darker background
        foreground: "#d6d2c4", // Slightly darker paper for less glare
        paper: {
          DEFAULT: "#2c2520", // Dark paper/card background
          light: "#3d342b",
          dark: "#1a1816",
          texture: "#e8e4d9", // Keep texture light but overlay will darken it
        },
        ink: {
          DEFAULT: "#e8e4d9", // Ink is now light (chalk/white ink) on dark paper
          dark: "#000000", // True black for shadows
          red: "#ff4d4d", // Brighter red for visibility on dark
          blue: "#4da6ff", // Brighter blue
          muted: "#9ca3af",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        typewriter: ['"Special Elite"', 'monospace'],
        hand: ['"Caveat"', 'cursive'],
        serif: ['"Lora"', 'serif'],
      },
      backgroundImage: {
        'paper-texture': "url('/paper-texture.png')", 
      },
      contrast: {
        125: '1.25',
      }
    },
  },
  plugins: [],
};
