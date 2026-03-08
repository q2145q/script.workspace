"use client";

import { useState, useEffect } from "react";
import { Header } from "./sections/header";
import { HeroSection } from "./sections/hero-section";
import { PainPointsSection } from "./sections/pain-points-section";
import { FeaturesSection } from "./sections/features-section";
import { ComparisonSection } from "./sections/comparison-section";
import { AISection } from "./sections/ai-section";
import { YomiSection } from "./sections/yomi-section";
import { AudienceSection } from "./sections/audience-section";
import { BetaStorySection } from "./sections/beta-story-section";
import { PricingSection } from "./sections/pricing-section";
import { FAQSection } from "./sections/faq-section";
import { FinalCTASection } from "./sections/final-cta-section";
import { LandingFooter } from "./sections/footer";

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
        <div className="section-divider" />
        <PainPointsSection />
        <div className="section-divider" />
        <FeaturesSection />
        <div className="section-divider" />
        <ComparisonSection />
        <div className="section-divider" />
        <AISection />
        <div className="section-divider" />
        <YomiSection />
        <div className="section-divider" />
        <AudienceSection />
        <div className="section-divider" />
        <BetaStorySection />
        <div className="section-divider" />
        <PricingSection />
        <div className="section-divider" />
        <FAQSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
