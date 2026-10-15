import "@testing-library/jest-dom/vitest";

// jsdom implements neither matchMedia nor IntersectionObserver. The
// marketing components (Hero, Navbar, Reveal, …) use framer-motion's
// useReducedMotion() (backed by matchMedia) and whileInView (backed by
// IntersectionObserver), so every test that renders them needs both
// stubbed — not just app/page.test.tsx — hence this lives in the shared
// setup file rather than one test.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
