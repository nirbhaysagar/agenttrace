import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { DetectionTicker } from "@/components/landing/DetectionTicker";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ArchitectureDiagram } from "@/components/landing/ArchitectureDiagram";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { StatsSection, CTASection } from "@/components/landing/StatsAndCTA";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { SectionFrame } from "@/components/landing/SectionFrame";

/**
 * High-Converting Attack Narrative Flow:
 * 1. THE HOOK          — HeroSection ("Your agent crashed at step 42...") + Inline Waitlist
 * 2. LIVE TELEMETRY    — DetectionTicker (Real-time causal anomaly stream)
 * 3. THE PAIN          — ProblemSection (The Status Quo is Broken: Ghost Bugs & Token Taxes)
 * 4. THE SOLUTION      — WorkflowSection (The 3 Invariants of Deterministic Debugging)
 * 5. CORE WEAPONS      — FeaturesSection (Replay, Multiverse, Zero-Leak Sandbox, AutoFix)
 * 6. DIRECT ATTACK     — ComparisonTable (AgentTrace vs. Passive Loggers: LangSmith, Braintrust, Arize)
 * 7. THE ENGINE        — ArchitectureDiagram (The Four-Stage Causal Pipeline)
 * 8. INTERACTIVE PROOF — DemoSection (Live timeline scrubber & counterfactual branching)
 * 9. HARD METRICS      — StatsSection (< 5ms overhead / 100% fidelity / 3 LOC)
 * 10. FLEET ADMISSION  — WaitlistSection (Dedicated priority early access capture)
 * 11. CLOSING BANNER   — CTASection
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col w-full bg-background min-h-screen">
      {/* 1. Hero */}
      <HeroSection />
      
      {/* 2. Live Causal Stream */}
      <DetectionTicker />

      {/* 3. The Brutal Pain */}
      <ProblemSection />

      {/* 4. The Solution: 3 Invariants */}
      <WorkflowSection />

      {/* 5. Core Weapon Features */}
      <FeaturesSection />

      {/* 6. Direct Attack Comparison */}
      <SectionFrame
        id="compare"
        label="Market Ledger"
        title="Active Execution Engine vs. Passive Telemetry Loggers"
        className="bg-card/20"
      >
        <ComparisonTable />
      </SectionFrame>

      {/* 7. Under The Hood: Four-Stage Architecture */}
      <SectionFrame
        id="architecture"
        label="System Architecture"
        title="The Four-Stage Causal Execution Pipeline"
        className="bg-card/30"
      >
        <ArchitectureDiagram />
      </SectionFrame>

      {/* 8. Interactive Trace Scrubber */}
      <DemoSection />

      {/* 9. Performance & Fidelity */}
      <StatsSection />

      {/* 10. Developer Fleet Waitlist */}
      <WaitlistSection />

      {/* 11. Final Closing CTA */}
      <CTASection />
    </div>
  );
}
