import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Design tokens ported 1:1 from reference/lovable-site/tailwind.config.ts
// (the founder's existing Lovable/Vite product). Content globs are adjusted
// for the Next.js App Router layout used by this project.
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        headline: ["Clash Display", "Space Grotesk", "system-ui", "sans-serif"],
        body: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        metric: ["Space Grotesk", "system-ui", "sans-serif"],
        "resume-heading": ["Playfair Display", "Georgia", "serif"],
        "resume-heading-alt": ["Merriweather", "Georgia", "serif"],
        "resume-body": ["Lora", "Georgia", "serif"],
        "resume-body-alt": ["Source Serif 4", "Georgia", "serif"],
      },
      fontSize: {
        display: ["clamp(2.75rem, 7vw, 5.75rem)", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
        h1: ["clamp(2.25rem, 4.5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.018em" }],
        h2: ["clamp(1.75rem, 3vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        h3: ["1.375rem", { lineHeight: "1.2", letterSpacing: "-0.012em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.62" }],
      },
      letterSpacing: {
        headline: "-0.018em",
        title: "-0.012em",
        button: "0.01em",
        label: "0.24em",
      },
      lineHeight: {
        headline: "0.98",
        title: "1.08",
        subheading: "1.25",
        body: "1.62",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
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
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
          foreground: "hsl(var(--ink-foreground))",
          muted: "hsl(var(--ink-muted))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
        fluid: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      boxShadow: {
        soft: "0 1px 2px -1px hsl(240 24% 12% / 0.05), 0 10px 20px -12px hsl(240 24% 12% / 0.12)",
        medium: "0 2px 4px -2px hsl(240 24% 12% / 0.06), 0 18px 36px -18px hsl(240 24% 12% / 0.16)",
        ambient: "var(--shadow-ambient)",
        "ambient-lg": "var(--shadow-ambient-lg)",
        glow: "0 20px 60px -18px hsl(244 66% 58% / 0.5)",
        "glow-secondary": "0 20px 60px -18px hsl(202 88% 58% / 0.45)",
        "glow-accent": "0 20px 60px -18px hsl(342 80% 68% / 0.45)",
        "inset-hi": "inset 0 1px 1px hsl(0 0% 100% / 0.7)",
        clay: "inset 0 1px 1px hsl(0 0% 100% / 0.6), var(--shadow-ambient)",
        "clay-pressed": "inset 0 2px 6px hsl(240 24% 12% / 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-4%, 5%, 0) scale(0.96)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        aurora: "aurora-drift 24s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
