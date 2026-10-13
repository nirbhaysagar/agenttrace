"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WaitlistForm } from "./WaitlistForm";

const HEADLINE_WORDS = [
  "Good luck reproducing it.",
  "Replay it locally for $0.",
  "Fork reality and fix it.",
];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(i => (i + 1) % HEADLINE_WORDS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // Animated dot grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gap = 56;
      const cols = Math.ceil(canvas.width / gap);
      const rows = Math.ceil(canvas.height / gap);
      const isDark = document.documentElement.classList.contains("dark");
      const baseAlpha = isDark ? 0.18 : 0.12;

      for (let x = 0; x <= cols; x++) {
        for (let y = 0; y <= rows; y++) {
          const px = x * gap;
          const py = y * gap;
          const dist = Math.sqrt(
            Math.pow(px - canvas.width / 2, 2) + Math.pow(py - canvas.height / 2, 2)
          );
          const pulse = Math.sin(t * 0.015 - dist * 0.012) * 0.5 + 0.5;
          const alpha = baseAlpha * pulse;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          ctx.fill();
        }
      }
      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden bg-background pt-24 pb-16">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 mb-10 opacity-0 translate-y-3"
          style={{
            animation: revealed ? "fadeUp 0.6s ease forwards 0.2s" : "none",
          }}
        >
          <span className="text-xs font-mono text-brand uppercase tracking-[0.25em] border border-brand/30 px-3.5 py-1.5 rounded-full bg-brand/10 font-semibold shadow-sm">
            Passive Tracing is Dead · Active Replay Engine
          </span>
        </div>

        {/* Main headline */}
        <div
          className="opacity-0 translate-y-6"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.35s" : "none",
          }}
        >
          <h1 className="text-[clamp(44px,6.8vw,92px)] font-bold leading-[1.08] tracking-tight text-foreground">
            Your agent crashed at step 42.
          </h1>
          <h1 className="text-[clamp(40px,6.2vw,84px)] font-bold leading-[1.12] tracking-tight text-brand mt-2 min-h-[1.25em]">
            <span key={wordIndex} className="inline-block drop-shadow-sm" style={{ animation: "fadeUp 0.5s ease forwards" }}>
              {HEADLINE_WORDS[wordIndex]}
            </span>
          </h1>
        </div>

        {/* Sub */}
        <p
          className="mt-6 text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.65s" : "none",
          }}
        >
          Stop re-running broken agents 50 times hoping the bug reproduces. AgentTrace freezes complete causal states so you can replay, mutate, and fix failures with mathematical certainty.
        </p>

        {/* Feature Pills */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2 opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.75s" : "none",
          }}
        >
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-card border border-border text-foreground">
            ⚡ Deterministic Replay
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-card border border-border text-foreground">
            🔱 Multiverse Branching
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-card border border-border text-foreground">
            🛡️ Zero-Leak Sandbox
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-card border border-border text-foreground">
            🩹 AutoFix Engine
          </span>
        </div>

        {/* Inline Waitlist CTA */}
        <div
          className="mt-10 opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.85s" : "none",
          }}
        >
          <WaitlistForm variant="inline" />
        </div>

        {/* Quick links & micro-copy */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.6s ease forwards 1.0s" : "none",
          }}
        >
          <Link
            href="/#architecture"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            How it works ↓
          </Link>
          <span className="text-border">·</span>
          <Link
            href="/#features"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Capabilities
          </Link>
          <span className="text-border">·</span>
          <Link
            href="/#compare"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Compare Matrix
          </Link>
          {/* <span className="text-border">·</span>
          <Link
            href="/login"
            className="text-brand hover:underline font-medium"
          >
            Tester Login →
          </Link> */}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-60">
        <div
          className="w-px bg-border opacity-0"
          style={{
            height: 56,
            animation: revealed ? "fadeUp 0.6s ease forwards 1.3s" : "none",
          }}
        />
      </div>
    </section>
  );
}
