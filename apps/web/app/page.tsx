import { MotionConfig } from "framer-motion";
import Navbar from "@/components/marketing/Navbar";
import Hero from "@/components/marketing/Hero";
import ProductSection from "@/components/marketing/ProductSection";
import PhilosophySection from "@/components/marketing/PhilosophySection";
import Features from "@/components/marketing/Features";
import TrustSection from "@/components/marketing/TrustSection";
import Pricing from "@/components/marketing/Pricing";
import Footer from "@/components/marketing/Footer";

// The real landing page (BUILD_SPEC Part 4.9), replacing the Phase 0
// placeholder. Composition mirrors reference/lovable-site/src/pages/Index.tsx
// minus the CommunitySection and CareersSection, which the spec says to drop
// until they have real content, plus the new TrustSection the spec calls for.
//
// MotionConfig with reducedMotion="user" makes every framer-motion animation
// in the tree below (Reveal, Hero's entrance motion, the Features/Pricing
// whileInView reveals, GuidingPrinciplesIndex) automatically honour the
// visitor's prefers-reduced-motion setting, on top of the manual
// useReducedMotion() checks some components already do.
export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-background">
        <Navbar />
        <main>
          <Hero />
          <ProductSection />
          <PhilosophySection />
          <Features />
          <TrustSection />
          <Pricing />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
