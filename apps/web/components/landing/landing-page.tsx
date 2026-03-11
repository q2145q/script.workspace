"use client";

import { useState, useEffect } from "react";
import { Header } from "./sections/header";
import { HeroSection } from "./sections/hero-section";
import { ProblemSection } from "./sections/problem-section";
import { WorkflowSection } from "./sections/workflow-section";
import { AISection } from "./sections/ai-section";
import { FeaturesSection } from "./sections/features-section";
import { ForWhoSection } from "./sections/for-who-section";
import { SocialSection } from "./sections/social-section";
import { PricingSection } from "./sections/pricing-section";
import { FAQSection } from "./sections/faq-section";
import { FinalCTASection } from "./sections/final-cta-section";
import { Footer } from "./sections/footer";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing">
      <Header scrolled={scrolled} />
      <main>
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <AISection />
        <FeaturesSection />
        <ForWhoSection />
        <SocialSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
