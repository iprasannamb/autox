import type { Metadata } from "next";
import { Navbar } from "./components/landing/Navbar";
import { Hero } from "./components/landing/Hero";
import { StorySection } from "./components/landing/StorySection";
import { BentoGrid } from "./components/landing/BentoGrid";
import { InteractiveAIDemo } from "./components/landing/InteractiveAIDemo";
import { SocialProof } from "./components/landing/SocialProof";
import { FinalCTA } from "./components/landing/FinalCTA";
import { Footer } from "./components/landing/Footer";

export const metadata: Metadata = {
  title: "autoX — Stop Buying, Start Growing | Wealth Intelligence for India",
  description:
    "autoX reveals the true opportunity cost of every purchase. See what your spending compounds to over 5, 10, and 20 years with AI-powered financial intelligence.",
  keywords: [
    "opportunity cost calculator",
    "personal finance India",
    "wealth building",
    "compound interest",
    "spending vs investing",
    "AI expense tracker",
    "SIP calculator",
  ],
  openGraph: {
    title: "autoX — Turn Spending into Lifetime Wealth",
    description:
      "Every rupee you spend has an opportunity cost. See what your spending could become if invested instead.",
    url: "https://autox.finance",
    siteName: "autoX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autoX — Turn Spending into Lifetime Wealth",
    description:
      "autoX calculates the real opportunity cost of your daily expenses. Stop buying, start growing.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200 selection:bg-sky-500/20 selection:text-sky-600 dark:selection:text-sky-300">
      {/* Sticky Glass Navbar */}
      <Navbar />

      <main>
        {/* 1. Hero Section with Starlight Beams & Interactive Mockup */}
        <Hero />

        {/* 2. Story Section: 2-Column Editorial Problem Statement */}
        <StorySection />

        {/* 3. Bento Grid: 12-Column Responsive Features Grid */}
        <BentoGrid />

        {/* 4. Standout AI Engine Showcase: Interactive What-If Calculator */}
        <InteractiveAIDemo />

        {/* 5. Social Proof: Key Numbers Ticker, Ecosystem & Testimonials */}
        <SocialProof />

        {/* 6. Closing High-Conversion CTA Card */}
        <FinalCTA />
      </main>

      {/* 7. Clean Modern Footer */}
      <Footer />
    </div>
  );
}
