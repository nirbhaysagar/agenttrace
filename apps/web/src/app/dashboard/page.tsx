"use client";

import * as React from "react";
import { useJobs } from "@/hooks/use-database";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
    ArrowRight,
    ArrowUpRight,
    Terminal,
    GitFork,
    Play,
    X,
    ChevronDown,
    Copy,
    Check,
    Sparkles,
    Loader2,
    Key,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SystemCard } from "@/components/system/SystemCard";
import { StatusDot, StatusText } from "@/components/system/StatusSystem";
import { EmptyState, LoadingState } from "@/components/system/FeedbackSystem";

interface Trace {
    id: string;
    title?: string;
    status: string;
    created_at: string;
    metadata?: {
        title?: string;
        duration_s?: number;
        event_count?: number;
    };
}

export default function DashboardPage() {
    const { jobs, loading: jobsLoading } = useJobs();
    const { user } = useAuth();
    const router = useRouter();

    const [traces, setTraces] = React.useState<Trace[]>([]);
    const [tracesLoading, setTracesLoading] = React.useState(true);
    const [copiedPip, setCopiedPip] = React.useState(false);
    const [copiedSnippet, setCopiedSnippet] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);

    // Onboarding dismiss state (persisted in localStorage)
    const [onboardingVisible, setOnboardingVisible] = React.useState(true);
    React.useEffect(() => {
        const dismissed = localStorage.getItem("agenttrace-onboarding-dismissed");
        if (dismissed === "true") setOnboardingVisible(false);
    }, []);

    const dismissOnboarding = () => {
        setOnboardingVisible(false);
        localStorage.setItem("agenttrace-onboarding-dismissed", "true");
    };

    const showOnboarding = () => {
        setOnboardingVisible(true);
        localStorage.removeItem("agenttrace-onboarding-dismissed");
    };

    const handleCopyPip = () => {
        navigator.clipboard.writeText("pip install agenttrace-py");
        setCopiedPip(true);
        setTimeout(() => setCopiedPip(false), 2000);
    };

    const handleCopySnippet = () => {
        const code = `import agenttrace\n\n@agenttrace.run(name="my-first-agent")\ndef main():\n    return agenttrace.step("think", lambda: "Hello Multiverse!")\n\nmain()`;
        navigator.clipboard.writeText(code);
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
    };

    const handleSeedDemo = async () => {
        setSeeding(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/trace/seed", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token || ""}`,
                },
            });
            const data = await res.json();
            if (res.ok && data.traceId) {
                router.push(`/dashboard/traces/${data.traceId}`);
            }
        } catch (e) {
            console.error("Seed trace failed:", e);
        } finally {
            setSeeding(false);
        }
    };

    React.useEffect(() => {
        const fetchTraces = async () => {
            const { data } = await supabase
                .from("traces")
                .select("*")
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
                .limit(10);
            setTraces(data || []);
            setTracesLoading(false);
        };
        fetchTraces();
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="max-w-7xl mx-auto w-full space-y-12 py-6 px-4">

            {/* ─── Greeting ─────────────────────────────── */}
            <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground font-medium">
                    {greeting()}, {user?.name?.split(" ")[0] || "there"}
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-foreground leading-[1.2]">AgentTrace</h1>
                <p className="text-sm text-muted-foreground/80">
                    Trace and replay AI agent executions.
                </p>
            </div>

            {/* ─── Get Started Cards ───────────────────── */}
            {onboardingVisible ? (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                            Let&apos;s get started
                        </span>
                        <button
                            onClick={dismissOnboarding}
                            className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Interactive 3-Step Quickstart Banner */}
                    <div className="mb-6 bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border/50 gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-brand" /> Quickstart: Trace your first agent in under 2 minutes
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Install the Python SDK, decorate your agent entrypoint, and view deterministic multiverse replays.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleSeedDemo}
                                    disabled={seeding}
                                    className="text-xs gap-1.5 h-8 bg-brand text-brand-foreground hover:bg-brand/90"
                                >
                                    {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    {seeding ? "Generating..." : "1-Click Demo Trace"}
                                </Button>
                                <Link href="/dashboard/settings">
                                    <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 border-border/60">
                                        <Key className="w-3.5 h-3.5 text-muted-foreground" /> API Keys
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {/* Step 1: Install */}
                            <div className="bg-secondary/40 border border-border/60 rounded-xl p-3.5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
                                        Step 1: Install SDK
                                    </span>
                                    <button
                                        onClick={handleCopyPip}
                                        className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                        title="Copy pip install"
                                    >
                                        {copiedPip ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <code className="text-xs font-mono text-muted-foreground bg-background/60 border border-border/40 rounded-lg px-2.5 py-2 block overflow-x-auto">
                                    pip install agenttrace-py
                                </code>
                            </div>

                            {/* Step 2: Decorate */}
                            <div className="bg-secondary/40 border border-border/60 rounded-xl p-3.5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
                                        Step 2: Add 3-line wrapper
                                    </span>
                                    <button
                                        onClick={handleCopySnippet}
                                        className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                        title="Copy code snippet"
                                    >
                                        {copiedSnippet ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <code className="text-xs font-mono text-muted-foreground bg-background/60 border border-border/40 rounded-lg px-2.5 py-2 block overflow-x-auto whitespace-pre">
{`import agenttrace\n@agenttrace.run(name="my-agent")\ndef main(): return agenttrace.step("think", lambda: "ok")`}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                title: "Quickstart Guide",
                                desc: "Install SDK and capture your first execution.",
                                href: "/docs/getting-started",
                                icon: Terminal,
                            },
                            {
                                title: "Replay Interface",
                                desc: "Step through deterministic replay in sandbox.",
                                href: "/docs/replay",
                                icon: Play,
                            },
                            {
                                title: "Branching Logic",
                                desc: "Fork and compare execution paths.",
                                href: "/docs/branching",
                                icon: GitFork,
                            },
                        ].map((card) => {
                            const Icon = card.icon;
                            return (
                                <Link key={card.title} href={card.href} className="group outline-none">
                                    <div className="h-full relative bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-brand/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(99,102,241,0.07)] hover:-translate-y-0.5 flex flex-col justify-between">
                                        <div>
                                            {/* Premium Icon Treatment */}
                                            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                                <Icon className="w-5 h-5 text-brand" />
                                            </div>
                                            
                                            <h3 className="text-base font-semibold text-foreground tracking-tight mb-2 group-hover:text-brand transition-colors">
                                                {card.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                                                {card.desc}
                                            </p>
                                        </div>
                                        <div className="pt-6 flex justify-end opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <ArrowRight className="w-4 h-4 text-brand" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <button
                    onClick={showOnboarding}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Show onboarding
                </button>
            )}

            {/* ─── Tracing Section ─────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-xl font-semibold text-foreground">Tracing</h2>
                        <span className="text-xs text-muted-foreground/60">Last 10 executions</span>
                    </div>
                    <Link
                        href="/dashboard/traces"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 group"
                    >
                        View all <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                <SystemCard className="p-0 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-card-padding py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border bg-secondary">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-2">Last Run</div>
                        <div className="col-span-2 text-right">Events</div>
                        <div className="col-span-2 text-right">Success</div>
                        <div className="col-span-1 text-right">Status</div>
                    </div>

                    {tracesLoading ? (
                        <LoadingState message="Fetching traces..." />
                    ) : traces.length === 0 ? (
                        <EmptyState 
                            message="No traces recorded" 
                            description="Integrate the AgentTrace SDK to start observing AI executions."
                        />
                    ) : (
                        <div className="divide-y divide-border">
                            {traces.slice(0, 5).map((trace) => (
                                <Link
                                    key={trace.id}
                                    href={`/dashboard/traces/${trace.id}`}
                                    className="grid grid-cols-12 gap-4 px-card-padding py-3.5 text-sm hover:bg-secondary transition-colors items-center group"
                                >
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                        <StatusDot status={trace.status} />
                                        <span className="font-medium truncate group-hover:text-accent transition-colors">
                                            {trace.title || trace.metadata?.title || "Untitled Trace"}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
                                        {formatDate(trace.created_at)}
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-muted-foreground tabular-nums">
                                        {trace.metadata?.event_count ?? 0}
                                    </div>
                                    <div className="col-span-2 text-right text-xs tabular-nums text-success">
                                        100%
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <StatusText status={trace.status} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </SystemCard>
            </section>

            {/* ─── Recent Jobs ─────────────────────────── */}
            {!jobsLoading && jobs.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-baseline justify-between px-1">
                        <h2 className="text-xl font-semibold text-foreground">Recent Jobs</h2>
                        <Link
                            href="/dashboard/jobs"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 group"
                        >
                            View all <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <SystemCard className="p-0 overflow-hidden">
                        <div className="divide-y divide-border">
                            {jobs.slice(0, 3).map((job) => (
                                <Link
                                    key={job.id}
                                    href={`/dashboard/traces/${job.trace_id}`}
                                    className="flex items-center justify-between px-card-padding py-3.5 hover:bg-secondary transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <StatusDot status={job.status} />
                                        <span className="text-xs font-mono text-muted-foreground group-hover:text-accent transition-colors">
                                            {job.id.slice(0, 12)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {formatDate(job.created_at)}
                                        </span>
                                        <StatusText status={job.status} className="w-16 text-right" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </SystemCard>
                </section>
            )}
        </div>
    );
}
