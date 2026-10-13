"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LOG_CHAOS = [
  "2024-03-14T09:21:03Z [INFO] Agent starting...",
  "2024-03-14T09:21:03Z [INFO] Fetching user context",
  "2024-03-14T09:21:04Z [DEBUG] HTTP GET /api/users/9021",
  "2024-03-14T09:21:04Z [INFO] User data loaded",
  "2024-03-14T09:21:05Z [INFO] Processing task",
  "2024-03-14T09:21:06Z [DEBUG] LLM call initiated",
  "2024-03-14T09:21:08Z [INFO] LLM response received",
  "2024-03-14T09:21:09Z [DEBUG] Tool call: get_balance",
  "2024-03-14T09:21:09Z [INFO] Balance: 1240.00",
  "2024-03-14T09:21:10Z [DEBUG] Tool call: apply_refund",
  "2024-03-14T09:21:11Z [INFO] Refund applied",
  "2024-03-14T09:21:11Z [DEBUG] Tool call: apply_refund",
  "2024-03-14T09:21:12Z [INFO] Refund applied",
  "2024-03-14T09:21:12Z [ERROR] Duplicate transaction detected",
  "2024-03-14T09:21:13Z [INFO] Agent completed",
  "2024-03-14T09:21:13Z [INFO] Exit: 0",
];

const TRACE_EVENTS = [
  { step: 1, type: "THINK", text: "Fetch user 9021 and check refund eligibility", ms: "12ms" },
  { step: 2, type: "CALL",  text: "get_user_context(id='9021')", ms: "89ms" },
  { step: 3, type: "THINK", text: "User eligible. Balance $1240. Proceed with refund.", ms: "6ms" },
  { step: 4, type: "CALL",  text: "apply_refund(amount=1240, user='9021')", ms: "210ms" },
  { step: 5, type: "CALL",  text: "apply_refund(amount=1240, user='9021') ⚠ DUPLICATE", ms: "195ms", error: true },
  { step: 6, type: "ERROR", text: "Duplicate TX: retry logic triggered on network timeout", ms: "—", error: true },
];

const typeColor: Record<string, string> = {
  THINK: "text-blue-500 dark:text-blue-400",
  CALL:  "text-emerald-600 dark:text-emerald-400",
  ERROR: "text-red-500 dark:text-red-400",
};
const typeBg: Record<string, string> = {
  THINK: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  CALL:  "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  ERROR: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400",
};

function useInView(ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function ProblemSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef as React.RefObject<Element>);
  const [visibleTrace, setVisibleTrace] = useState<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    TRACE_EVENTS.forEach((_, i) => {
      setTimeout(() => setVisibleTrace(p => [...p, i]), i * 300 + 600);
    });
  }, [inView]);

  const PAIN_POINTS = [
    {
      badge: "01 / The Ghost Bug",
      title: "Non-Deterministic Hell",
      desc: "An LLM drifts at Step 38. You try to debug locally. Model temperature drifts, the agent takes a different branch, and the bug evaporates. You're debugging a ghost.",
    },
    {
      badge: "02 / The Token Tax",
      title: "Paying to Reproduce Bugs",
      desc: "Traditional tools force you to re-execute live APIs to reproduce failures. Every attempt burns $5–$50 in tokens and risks duplicate writes in real databases.",
    },
    {
      badge: "03 / The Telemetry Illusion",
      title: "Passive JSON is Useless",
      desc: "LangSmith and Datadog show you a post-mortem trace after your agent crashes. They cannot replay it locally, cannot mock dependencies, and cannot test fixes.",
    },
  ];

  return (
    <section id="problem" className="py-28 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div ref={sectionRef} className="mb-16 max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-rose-500 font-semibold mb-4">
            The Status Quo is Broken
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold leading-[1.1] text-foreground mb-6">
            Passive loggers watch your agent crash.
            <br />
            <span className="text-muted-foreground">We let you freeze, replay, and mutate it.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            AI agents are stateful, probabilistic loops—not microservices. Traditional APMs and logging dashboards only give you an autopsy. They don&apos;t give you control.
          </p>
        </div>

        {/* 3 Pain Cards (Attacking Mode) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PAIN_POINTS.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card/60 p-6 sm:p-7 backdrop-blur-sm space-y-3"
            >
              <span className="text-[11px] font-mono text-rose-500 font-semibold uppercase tracking-wider block">
                {p.badge}
              </span>
              <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Split panel: Blind Chaos vs Causal Replay */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Left: chaos */}
          <div
            className={cn(
              "rounded-3xl border border-border bg-card overflow-hidden transition-all duration-700 flex flex-col justify-between",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/60" />
                <span className="w-3 h-3 rounded-full bg-amber-400/60" />
                <span className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <span className="text-xs font-mono text-red-500 font-medium">Standard APM / Text Logs — Zero Causal State</span>
            </div>
            <div className="p-5 font-mono text-[11px] leading-5 text-muted-foreground/60 h-[340px] overflow-hidden relative">
              {LOG_CHAOS.map((line, i) => (
                <div key={i} className={cn("truncate w-full", i === 13 && "text-red-500 font-semibold opacity-100")}>
                  {line}
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="px-5 py-4 border-t border-border bg-muted/20">
              <p className="text-xs text-rose-500 font-mono">
                ✕ Step 13 crashed. Cannot replay locally. Re-running triggers different hallucination.
              </p>
            </div>
          </div>

          {/* Right: clarity */}
          <div
            className={cn(
              "rounded-3xl border border-brand/40 bg-card overflow-hidden transition-all duration-700 delay-200 flex flex-col justify-between shadow-lg shadow-brand/5",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-brand/5">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand/40" />
                <span className="w-3 h-3 rounded-full bg-brand/60" />
                <span className="w-3 h-3 rounded-full bg-brand" />
              </div>
              <span className="text-xs font-mono text-brand font-medium">AgentTrace — Frozen Causal Execution Graph</span>
            </div>
            <div className="p-5 space-y-2 h-[340px] overflow-hidden">
              {TRACE_EVENTS.map((ev, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-400",
                    ev.error ? "border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30" : "border-border bg-background",
                    visibleTrace.includes(i) ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  )}
                >
                  <span className={cn("shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest", typeBg[ev.type])}>
                    {ev.type}
                  </span>
                  <span className={cn("flex-1 text-xs font-mono truncate", ev.error ? "text-red-600 dark:text-red-400 font-semibold" : "text-foreground")}>
                    {ev.text}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">{ev.ms}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border bg-emerald-500/5">
              <p className="text-xs text-emerald-500 dark:text-emerald-400 font-mono font-medium">
                ✓ Replayable locally on any machine with $0 API cost. Forked & patched in 45s.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
