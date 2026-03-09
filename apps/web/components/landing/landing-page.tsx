"use client";

import { useState, useEffect } from "react";
import { Header } from "./sections/header";
import { HeroSection } from "./sections/hero-section";
import { FeaturesSection } from "./sections/features-section";
import { AISection } from "./sections/ai-section";
import { ComparisonSection } from "./sections/comparison-section";
import { PricingSection } from "./sections/pricing-section";
import { ClosingSection } from "./sections/closing-section";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing">
      <Header scrolled={scrolled} />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AISection />
        <ComparisonSection />
        <PricingSection />
        <ClosingSection />
      </main>
    </div>
  );
}
