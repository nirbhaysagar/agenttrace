"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Disc, RotateCcw, GitFork, ShieldAlert, ArrowRight, Zap } from "lucide-react";

const LAWS = [
  {
    step: "01",
    tag: "Capture State",
    title: "Record Complete Causal Reality",
    desc: "Instrument with 3 lines of code. We freeze all LLM completions, tool inputs/outputs, network requests, system time, and random seeds with < 5ms latency overhead.",
    impact: "No reconstruction. No guessing. The complete causal timeline is locked in stone.",
    icon: Disc,
  },
  {
    step: "02",
    tag: "Local Playback",
    title: "Replay 500 Times for $0.00",
    desc: "Take any failing production trace and replay it locally on any engineer's laptop. Mock responses are delivered byte-for-byte from the trace cache without touching external APIs.",
    impact: "Zero token spend. Zero network calls. Zero staging database pollution.",
    icon: RotateCcw,
  },
  {
    step: "03",
    tag: "Counterfactuals",
    title: "Branch Reality at Step N",
    desc: "Why re-run steps 1 to 41 to test a fix at Step 42? Fork the execution graph, mutate the prompt or mock response, and observe the alternate outcome instantly.",
    impact: "Test 20 counterfactual prompt iterations in 30 seconds with mathematical certainty.",
    icon: GitFork,
  },
];

function useInView(ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setV(true); },
      { threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);

  return (
    <section className="py-28 bg-muted/20 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-brand font-semibold mb-4">
            The AgentTrace Solution
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold leading-[1.1] text-foreground mb-6">
            The three invariants of
            <br />
            <span className="text-muted-foreground">deterministic agent debugging.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Stop treating agent crashes like mysterious accidents. Treat them as deterministic state machines that can be paused, rewound, and branched at will.
          </p>
        </div>

        {/* 3 Solution Columns */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {LAWS.map((law, i) => {
            const Icon = law.icon;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-3xl border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-brand/40 transition-all duration-500",
                  inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono font-bold text-muted-foreground/50">{law.step}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full font-semibold">
                      {law.tag}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-5">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-3">{law.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{law.desc}</p>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <p className="text-xs text-brand font-medium leading-relaxed">
                    ⚡ {law.impact}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
