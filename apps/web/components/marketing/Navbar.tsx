"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PremiumButton from "./PremiumButton";

/**
 * Ported from reference/lovable-site/src/components/Navbar.tsx. The
 * reference version calls react-router's useNavigate() for every non-anchor
 * link; real route links here use next/link directly instead (no router
 * context needed, and it's the more idiomatic — crawlable, prefetchable —
 * choice for an actual nav item rather than a route). It never showed a
 * logged-in user menu (no Supabase auth coupling to drop), but per
 * BUILD_SPEC Part 4.9 the link set and CTAs change: Community is dropped,
 * "For Colleges" is added, and the CTA is a static "Start free" / "Log in"
 * pair pointing at /signup and /login (Phase 3+ fills in those routes).
 */
const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Philosophy", href: "#philosophy" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "For Colleges", href: "/for-colleges" },
];

const isAnchor = (href: string) => href.startsWith("#");

const desktopLinkClass =
  "rounded-full px-3.5 py-1.5 font-body text-[13px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground";

const Navbar = () => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // sentinel-free: read once + rAF-throttled — nav state only, no reveals
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const scrollTo = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4">
        <nav
          className={cn(
            "pointer-events-auto mt-5 flex w-full max-w-3xl items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2",
            "border border-foreground/[0.06] backdrop-blur-xl transition-[background-color,box-shadow,margin,max-width] duration-700 ease-fluid",
            scrolled
              ? "mt-3 max-w-2xl bg-background/80 shadow-ambient"
              : "bg-background/55 shadow-[0_10px_40px_-24px_hsl(240_24%_12%/0.25)]",
          )}
        >
          {/* Wordmark */}
          <button
            onClick={() => scrollTo("#top")}
            className="flex items-center gap-2.5 pr-2"
            aria-label="Vyoman home"
          >
            <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-ink text-ink-foreground">
              <span className="font-headline text-[13px] font-semibold leading-none">V</span>
              <span className="absolute inset-0 rounded-lg bg-gradient-to-tr from-primary/50 via-transparent to-accent/40 mix-blend-screen" />
            </span>
            <span className="font-headline text-[15px] font-semibold tracking-tight text-foreground">
              Vyoman
            </span>
          </button>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                {isAnchor(l.href) ? (
                  <button onClick={() => scrollTo(l.href)} className={desktopLinkClass}>
                    {l.label}
                  </button>
                ) : (
                  <Link href={l.href} className={desktopLinkClass}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="rounded-full px-3 py-1.5 font-body text-[13px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              Log in
            </Link>
            <PremiumButton size="md" href="/signup">
              Start free
            </PremiumButton>
          </div>

          {/* Mobile hamburger — morphs to X */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-foreground/[0.05] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span className="relative block h-3 w-4">
              <motion.span
                className="absolute left-0 top-0 block h-[1.5px] w-4 rounded-full bg-foreground"
                animate={open ? { rotate: 45, y: 5.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              />
              <motion.span
                className="absolute bottom-0 left-0 block h-[1.5px] w-4 rounded-full bg-foreground"
                animate={open ? { rotate: -45, y: -5.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              />
            </span>
          </button>
        </nav>
      </header>

      {/* Full-screen mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-between bg-background/80 px-6 pb-10 pt-28 backdrop-blur-3xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          >
            <ul className="flex flex-col gap-2">
              {LINKS.map((l, i) => {
                const itemMotion = {
                  initial: { y: 48, opacity: 0 },
                  animate: { y: 0, opacity: 1 },
                  exit: { y: 24, opacity: 0 },
                  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.06 + i * 0.05 },
                };
                return (
                  <li key={l.href} className="overflow-hidden">
                    {isAnchor(l.href) ? (
                      <motion.button
                        onClick={() => scrollTo(l.href)}
                        className="font-headline text-4xl font-semibold tracking-tight text-foreground"
                        {...itemMotion}
                      >
                        {l.label}
                      </motion.button>
                    ) : (
                      <motion.div {...itemMotion}>
                        <Link
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="font-headline text-4xl font-semibold tracking-tight text-foreground"
                        >
                          {l.label}
                        </Link>
                      </motion.div>
                    )}
                  </li>
                );
              })}
            </ul>

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
              className="flex flex-col gap-3"
            >
              <PremiumButton href="/signup" onClick={() => setOpen(false)} className="w-full">
                Start free
              </PremiumButton>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full rounded-full px-6 py-3 text-center font-body text-sm font-medium text-foreground ring-1 ring-inset ring-foreground/15 transition-colors hover:bg-foreground/[0.04]"
              >
                Log in
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
