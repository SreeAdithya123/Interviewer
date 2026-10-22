import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans -> --font-body, Space Grotesk -> --font-metric (and the
// headline fallback behind Clash Display). Weights match
// reference/lovable-site/index.html's Google Fonts request.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vyoman Interviewer",
    template: "%s | Vyoman Interviewer",
  },
  description:
    "AI-powered interview practice for Indian college students — ace interviews, apply faster, and land offers with confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Suppress unhandled runtime errors thrown by third-party browser extensions
            (e.g. AI companions, ad blockers, password managers) from bubbling up into
            Next.js's dev overlay. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(event) {
                  if (event.filename && event.filename.indexOf('chrome-extension://') !== -1) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(event) {
                  var reason = (event.reason && (event.reason.stack || event.reason.toString())) || '';
                  if (reason.indexOf('chrome-extension://') !== -1) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (Grammarly, Twilio, etc.)
          inject attributes like data-gr-ext-installed onto <body> before React
          hydrates, which otherwise logs a false-positive hydration mismatch. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
