"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, RotateCcw, GitFork, SplitSquareVertical, Clock, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: RotateCcw,
    title: "Zero-Token Deterministic Replay",
    description: "Replay a 100-step agent crash locally on your laptop 500 times. All API responses, tool outputs, and environment states are fed byte-for-byte from the trace.",
    detail: "Cost: $0.00. Network calls: 0. Staging pollution: 0.",
    tag: "Core",
  },
  {
    icon: GitFork,
    title: "Multiverse Branching Engine",
    description: "Why re-run steps 1 to 41 to test a fix at Step 42? Fork the execution graph, mutate the prompt or tool output, and observe counterfactual branches in real time.",
    detail: "Test 20 prompt variants in 30 seconds without paying for upstream steps.",
    tag: "Core",
  },
  {
    icon: Shield,
    title: "Zero-Leak Governance Sandbox",
    description: "Passive tracers watch secrets leak in post-mortems. Our sandbox terminates execution the exact millisecond an agent touches an unrecorded network socket or unauthorized file.",
    detail: "Guaranteed isolation. Zero unrecorded external mutations.",
    tag: "Security",
  },
  {
    icon: SplitSquareVertical,
    title: "AutoFix Engine (AFE)",
    description: "AI-powered differential analysis that compares passing and failing runs, pinpoints the root-cause divergence point, and automatically proposes a code patch.",
    detail: "Go from bug report to verified code fix in under 60 seconds.",
    tag: "AI Fix",
  },
  {
    icon: Eye,
    title: "Causal Execution Capture",
    description: "Every prompt token, tool invocation, environment variable, and system clock tick captured with cryptographic Merkle hashes. Nothing inferred, nothing lost.",
    detail: "Complete causal graphs replacing useless flat log files.",
    tag: "Engine",
  },
  {
    icon: Clock,
    title: "State-Machine Time Travel",
    description: "Step backward and forward through any multi-agent loop. Pause at any decision node. Inspect live memory, inspect tool inputs, and inject custom mocks.",
    detail: "A true debugger for non-deterministic agent workflows.",
    tag: "Engine",
  },
];

const TAG_STYLES: Record<string, string> = {
  Core: "bg-brand/10 text-brand border border-brand/20",
  Security: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
  "AI Fix": "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  Engine: "bg-secondary text-foreground border border-border",
};

function useInView(ref: React.RefObject<Element | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative rounded-2xl border border-border bg-card p-7 hover:border-foreground/20 transition-all duration-500 cursor-default",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${(index % 3) * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="p-2.5 rounded-xl bg-muted border border-border group-hover:bg-secondary transition-colors duration-300">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", TAG_STYLES[feature.tag])}>
          {feature.tag}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
      
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-foreground/60 italic">{feature.detail}</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const inView = useInView(titleRef as React.RefObject<Element>);

  return (
    <section id="features" className="py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {/* Header */}
        <div
          ref={titleRef}
          className={cn(
            "max-w-2xl transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-xs font-mono text-brand uppercase tracking-[0.25em] font-semibold mb-4">
            Engineered Capabilities
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground leading-[1.1]">
            Built to kill flaky runs
            <br />
            <span className="text-muted-foreground">before they reach production.</span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 leading-relaxed">
            Zero token burn. Zero blind spots. Absolute deterministic control over non-deterministic LLM agents.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}
