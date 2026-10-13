"use client";

import React, { useEffect, useState } from "react";
import { WaitlistForm } from "./WaitlistForm";
import { ShieldCheck, GitFork, Cpu, Terminal, Users, Sparkles, CheckCircle2 } from "lucide-react";

export function WaitlistSection() {
  const [totalSignups, setTotalSignups] = useState<number>(142);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.total) setTotalSignups(data.total);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="waitlist" className="relative py-32 bg-background border-t border-border overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Copy & Perks */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-card border border-border text-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Admitting Developers Weekly</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                Stop debugging in the dark.
                <br />
                <span className="text-muted-foreground">Get early access.</span>
              </h2>

              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                Be the first to run deterministic, counterfactual replays on your autonomous agents. Free your team from non-deterministic flaky failures.
              </p>
            </div>

            {/* Perks Grid */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-card border border-border text-brand mt-0.5">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Exclusive Python & Node SDK Access</h4>
                  <p className="text-xs text-muted-foreground">Direct access to the deterministic interceptor and decorators before public PyPI release.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-card border border-border text-brand mt-0.5">
                  <GitFork className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Multiverse Sandbox Cloud Credits</h4>
                  <p className="text-xs text-muted-foreground">Complimentary cloud replay hours on our isolated execution backend.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-card border border-border text-brand mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Direct Engineering Slack Channel</h4>
                  <p className="text-xs text-muted-foreground">Collaborate 1-on-1 with the core team to instrument custom tool frameworks and models.</p>
                </div>
              </div>
            </div>

            {/* Live Count Pill */}
            <div className="pt-2 flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">AD</div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">SK</div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300">MS</div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                <span className="font-bold text-foreground">{totalSignups}+</span> engineers registered from teams building on OpenAI, LangChain & CrewAI
              </p>
            </div>
          </div>

          {/* Right Column: Full Form */}
          <div className="lg:col-span-6">
            <WaitlistForm variant="full" />
          </div>

        </div>
      </div>
    </section>
  );
}
