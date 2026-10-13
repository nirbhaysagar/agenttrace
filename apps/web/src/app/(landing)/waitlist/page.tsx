"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import {
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
  Cpu,
  GitFork,
  RotateCcw,
  Zap,
  Disc,
  AlertTriangle,
  Flame,
  Ghost,
} from "lucide-react";

export default function StandaloneWaitlistPage() {
  const [totalCount, setTotalCount] = useState(142);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.total) setTotalCount(data.total);
      })
      .catch(() => {});
  }, []);

  const PAIN_POINTS = [
    {
      icon: Ghost,
      badge: "01 / Ghost Bugs",
      title: "Non-Deterministic Hell",
      desc: "An LLM drifts at Step 38. You try to debug it locally. Model temperature drifts, the agent takes a different branch, and the bug evaporates. You're debugging thin air.",
    },
    {
      icon: Flame,
      badge: "02 / Token Waste",
      title: "The Re-Run Token Tax",
      desc: "Every reproduction attempt burns $5–$50 in live LLM tokens and risks firing real duplicate writes into customer staging or production databases.",
    },
    {
      icon: AlertTriangle,
      badge: "03 / Passive Telemetry",
      title: "The Post-Mortem Illusion",
      desc: "Datadog and LangSmith give you passive JSON dumps after the disaster happened. They cannot replay the run, cannot mock dependencies, and cannot test fixes.",
    },
  ];

  const SOLUTIONS = [
    {
      step: "01",
      title: "Record Complete Causal Reality",
      desc: "Instrument with 3 lines of code. We freeze all tool responses, LLM completions, system time, and random seeds with < 5ms latency overhead.",
      metric: "< 5ms overhead",
      icon: Disc,
    },
    {
      step: "02",
      title: "Replay 500 Times for $0.00",
      desc: "Take any failing production trace and replay it locally on any engineer's laptop. Mock responses are delivered byte-for-byte from the trace cache without touching external APIs.",
      metric: "Zero token cost",
      icon: RotateCcw,
    },
    {
      step: "03",
      title: "Branch Reality at Step N",
      desc: "Why re-run steps 1 to 41 to test a fix at Step 42? Fork the execution graph, mutate the prompt or tool output, and observe counterfactual branches in real time.",
      metric: "Instant 'What-If'",
      icon: GitFork,
    },
  ];

  const FEATURES = [
    {
      icon: RotateCcw,
      title: "Zero-Token Deterministic Replay",
      badge: "Local Mocking",
      desc: "Replay multi-step agent trajectories locally with 100% byte-for-byte fidelity without spending a single API token or triggering external side-effects.",
    },
    {
      icon: GitFork,
      title: "The Multiverse Branching Engine",
      badge: "Counterfactuals",
      desc: "Branch execution at step N, mutate prompts, tool payloads, or model outputs, and observe alternative realities with mathematical certainty.",
    },
    {
      icon: ShieldCheck,
      title: "Zero-Leak Governance Sandbox",
      badge: "Strict Auditing",
      desc: "Auditing mode with virtual file systems and network gating that halts execution instantly if unrecorded calls or secret leaks are attempted.",
    },
    {
      icon: Cpu,
      title: "AutoFix Engine (AFE) Access",
      badge: "Root-Cause AI",
      desc: "Automated causal anomaly detection, graph difference analysis, and AI-generated code patches to permanently eradicate flaky agent bugs.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between pt-20 pb-24 overflow-hidden selection:bg-brand/20">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-brand/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="container relative z-10 max-w-4xl mx-auto px-6">
        
        {/* Navigation back */}
        <div className="mb-12 text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to AgentTrace</span>
          </Link>
        </div>

        {/* ─── 1. MAIN TAGLINE & 2. THE DESCRIPTION ─── */}
        <div className="text-center max-w-3xl mx-auto space-y-5 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-card/80 border border-border text-foreground shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Developer Early Access · {totalCount}+ Engineers Enrolled</span>
          </div>

          {/* MAIN TAGLINE */}
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
            Never let a flaky agent bug
            <br />
            <span className="text-muted-foreground">vanish into thin air again.</span>
          </h1>

          {/* THE DESCRIPTION */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Record complete causal states. Replay failures locally for $0 without calling external APIs. Fork reality to test counterfactual fixes with mathematical certainty.
          </p>
        </div>

        {/* ─── 3. THE EMAIL & NECESSARY QUESTIONS FORM ─── */}
        <div className="mb-28">
          <WaitlistForm variant="full" />
        </div>

        {/* ─── 4. THE PAIN (Short, Attacking, Clean) ─── */}
        <div className="pt-16 border-t border-border/50 mb-28">
          <div className="text-left sm:text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-rose-500 font-semibold block">
              The Brutal Pain
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Why passive loggers fail when agents fail.
            </h2>
            <p className="text-sm text-muted-foreground">
              Traditional observability was built for REST APIs, not autonomous non-deterministic loops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAIN_POINTS.map((pain, i) => {
              const Icon = pain.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-border/80 bg-card/60 p-7 backdrop-blur-sm space-y-3 text-left hover:border-border transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-rose-500/90 uppercase tracking-wider block">
                    {pain.badge}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{pain.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {pain.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 5. THE SOLUTION (Clean & Simple Invariants) ─── */}
        <div className="pt-16 border-t border-border/50 mb-28">
          <div className="text-left sm:text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-brand font-semibold block">
              The Solution
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              The three laws of deterministic debugging.
            </h2>
            <p className="text-sm text-muted-foreground">
              Turning non-deterministic chaos into reproducible state machines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SOLUTIONS.map((sol, i) => {
              const Icon = sol.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-border/80 bg-card/60 p-7 backdrop-blur-sm space-y-4 text-left hover:border-brand/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-muted-foreground/40">{sol.step}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{sol.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {sol.desc}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border/50">
                    <span className="text-xs font-mono text-brand font-semibold">⚡ {sol.metric}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 6. THE FEATURES (The Core Weapons) ─── */}
        <div className="pt-16 border-t border-border/50 mb-16">
          <div className="text-left sm:text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-brand font-semibold block">
              The Features
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built to kill flaky runs before production.
            </h2>
            <p className="text-sm text-muted-foreground">
              What you unlock when your engineering team is admitted to the private fleet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-border/80 bg-card/60 p-7 backdrop-blur-sm hover:border-brand/40 transition-all space-y-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80 px-2.5 py-1 rounded-lg bg-background border border-border/60">
                      {feat.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean, Simple Footer Note */}
        <div className="text-center pt-10 border-t border-border/40 text-xs text-muted-foreground font-mono">
          AgentTrace · Deterministic Replay & Multiverse Branching for AI Agents
        </div>

      </div>
    </div>
  );
}
