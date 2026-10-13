"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistFormProps {
  variant?: "inline" | "full";
  className?: string;
  onSuccess?: (position: number) => void;
}

export function WaitlistForm({ variant = "inline", className, onSuccess }: WaitlistFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [framework, setFramework] = useState("LangChain");
  const [useCase, setUseCase] = useState("Flaky & Unreproducible Runs");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    position: number;
    referralCode: string;
    message: string;
    alreadyRegistered?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const FRAMEWORKS = [
    { id: "LangChain", label: "LangChain / LangGraph" },
    { id: "CrewAI", label: "CrewAI" },
    { id: "AutoGen", label: "Microsoft AutoGen" },
    { id: "LlamaIndex", label: "LlamaIndex" },
    { id: "Custom Python", label: "Custom Python Runtime" },
    { id: "TypeScript", label: "TypeScript / Node.js" },
  ];

  const PAIN_OPTIONS = [
    {
      id: "Flaky & Unreproducible Runs",
      title: "Flaky & Unreproducible Runs",
      desc: "Bugs happen once in prod, temperature drifts, and they vanish locally.",
      emoji: "💥",
    },
    {
      id: "High Re-run Token Costs",
      title: "High Re-run Token Costs",
      desc: "Burning $10–$50 in live API credits re-running broken agents to hit bugs.",
      emoji: "💸",
    },
    {
      id: "Zero-Leak Security & Audit",
      title: "Zero-Leak Security & Audit",
      desc: "Need sandboxed execution gating to stop unrecorded network/file calls.",
      emoji: "🛡️",
    },
    {
      id: "Slow Root-Cause Diagnostics",
      title: "Slow Root-Cause Diagnostics",
      desc: "Wasting hours scrolling through 50-step logs trying to spot hallucinations.",
      emoji: "🩹",
    },
  ];

  const validateEmail = (val: string) => {
    return val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleNextStep1 = () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid work email address.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateEmail(email)) {
      setStep(1);
      setError("Please enter a valid work email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || undefined,
          company: company.trim() || undefined,
          framework: framework || undefined,
          useCase: useCase || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Unable to join waitlist. Please try again.");
      }

      setSubmittedData(data);
      if (onSuccess) onSuccess(data.position);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReferral = () => {
    if (!submittedData) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/waitlist?ref=${submittedData.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submittedData) {
    return (
      <div className={cn("p-8 sm:p-10 rounded-3xl border border-brand/30 bg-card backdrop-blur-xl text-center shadow-xl transition-all animate-in fade-in duration-500 max-w-xl mx-auto", className)}>
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Check className="w-7 h-7" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-brand/10 text-brand border border-brand/20 mb-3">
          <span>Priority Queue #{submittedData.position}</span>
        </div>

        <h3 className="text-2xl font-bold text-foreground">You&apos;re on the fleet priority list!</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          {submittedData.message || "We admit development teams weekly. We will send invite credentials directly to your inbox."}
        </p>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="font-mono text-muted-foreground">
            Invite Code: <span className="font-bold text-foreground">{submittedData.referralCode}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyReferral}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors font-medium shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Link Copied!" : "Share referral link"}
          </button>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className={cn("w-full max-w-lg mx-auto", className)}>
        <div className="relative flex items-center rounded-2xl border border-border bg-card p-1.5 shadow-xl focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your work email..."
            className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:bg-brand hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Joining...</span>
              </>
            ) : (
              <>
                <span>Request Access</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-rose-500 flex items-center justify-center gap-1.5 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </form>
    );
  }

  // ─── FULL VARIANT: CLEAN & MINIMAL STEP-BY-STEP ───
  return (
    <div className={cn("w-full max-w-xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl text-left transition-all", className)}>
      
      {/* ── QUESTION 1: EMAIL ── */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            What is your work email?
          </h3>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNextStep1();
                  }
                }}
                placeholder="name@company.com"
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleNextStep1}
                disabled={!email}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-semibold text-background hover:bg-brand hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5 animate-in fade-in pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── QUESTION 2: FRAMEWORK ── */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              What framework do you use?
            </h3>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FRAMEWORKS.map((fw) => {
              const active = framework === fw.id;
              return (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => {
                    setFramework(fw.id);
                    setStep(3);
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-sm font-medium transition-all text-center cursor-pointer",
                    active
                      ? "border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand/30"
                      : "border-border bg-background hover:border-foreground/30 text-foreground"
                  )}
                >
                  {fw.id}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── QUESTION 3: BOTTLENECK ── */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              What is your main bottleneck?
            </h3>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAIN_OPTIONS.map((pain) => {
              const active = useCase === pain.id;
              return (
                <button
                  key={pain.id}
                  type="button"
                  onClick={() => {
                    setUseCase(pain.id);
                    setStep(4);
                  }}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                    active
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/30"
                      : "border-border bg-background hover:border-foreground/30 text-foreground"
                  )}
                >
                  <span className="text-sm font-medium">{pain.title}</span>
                  {active && <Check className="w-4 h-4 text-brand shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── QUESTION 4: COMPANY & SUBMIT ── */}
      {step === 4 && (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Company or team name?
            </h3>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                autoFocus
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme AI (or Independent)"
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-semibold text-background hover:bg-brand hover:text-white transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>Join Waitlist</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
