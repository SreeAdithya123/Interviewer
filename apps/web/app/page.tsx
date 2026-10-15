// Phase 0 placeholder only. This is NOT the real landing page — Phase 2
// ports Navbar/Hero/Footer/etc. from reference/lovable-site/src/components/.
// This page exists purely to prove the design tokens (colors, fonts, radius)
// ported into globals.css + tailwind.config.ts are wired correctly.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 py-24 text-center">
      <span className="eyebrow bg-ink-soft text-ink-muted">Vyoman Interviewer</span>
      <h1 className="font-headline text-ink-foreground">
        Design system <span className="text-spectrum">wired up</span>.
      </h1>
      <p className="font-body text-ink-muted">
        Plus Jakarta Sans body copy, Clash Display headlines, and the Neural
        Indigo primary color — scaffolded in Phase 0 so Phase 2 can build the
        real landing page on top of it.
      </p>
      <button type="button" className="btn-primary">
        Start a mock interview
      </button>
    </main>
  );
}
