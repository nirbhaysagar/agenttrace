import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchTraceEvents, computeCausalHash } from "@/lib/replay-simulation";
import { resolveAuth } from "@/lib/api-auth";
import crypto from "crypto";

const EXECUTION_ENGINE_URL = process.env.EXECUTION_ENGINE_URL;

function isRemoteEngineConfigured(): boolean {
    if (!EXECUTION_ENGINE_URL) return false;
    return !EXECUTION_ENGINE_URL.includes("127.0.0.1") && !EXECUTION_ENGINE_URL.includes("localhost");
}

/**
 * GET /api/branches?traceId=<id>
 * Lists all multiverse branches for a trace.
 * Strictly enforced organization boundary.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const traceId = searchParams.get("traceId");

        if (!traceId) {
            return NextResponse.json({ error: "traceId is required for security isolation" }, { status: 400 });
        }

        const auth = await resolveAuth(req);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const orgId = auth.orgId;

        const { data: trace, error: traceError } = await supabaseAdmin
            .from("traces")
            .select("org_id")
            .eq("id", traceId)
            .single();

        if (traceError || !trace || (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true" && trace.org_id !== orgId)) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        // Try remote execution engine if explicitly configured
        if (isRemoteEngineConfigured()) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/branches/list?trace_id=${traceId}`, {
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (engineResponse.ok) {
                    const result = await engineResponse.json();
                    return NextResponse.json(result);
                }
            } catch (err) {
                console.warn("[branches GET] Remote engine failed, falling back to serverless query:", err);
            }
        }

        // Serverless Supabase query fallback (Zero-cost, fully resilient)
        const { data: dbBranches, error: branchErr } = await supabaseAdmin
            .from("branches")
            .select("*")
            .eq("trace_id", traceId)
            .order("created_at", { ascending: false });

        if (branchErr) {
            console.error("[branches GET] Supabase query error:", branchErr);
            return NextResponse.json({ success: true, branches: [] });
        }

        const normalized = (dbBranches || []).map((b: any) => {
            const overrides = b.overrides || {};
            return {
                id: b.id,
                parentTraceId: b.trace_id,
                forkStep: b.fork_step ?? 0,
                name: b.name || `fork-step-${b.fork_step ?? 0}`,
                parentHash: overrides._parent_hash || null,
                createdAt: b.created_at,
                overridePayload: overrides._override || null,
            };
        });

        return NextResponse.json({ success: true, branches: normalized });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}

/**
 * POST /api/branches
 * Body: { traceId, forkStep, overrideJson, overridePayload, name }
 */
export async function POST(req: Request) {
    try {
        const { traceId, forkStep, overrideJson, overridePayload, name } = await req.json();

        if (!traceId || forkStep === undefined) {
            return NextResponse.json({ error: "traceId and forkStep are required" }, { status: 400 });
        }

        const auth = await resolveAuth(req);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const orgId = auth.orgId;

        const { data: trace, error: traceError } = await supabaseAdmin
            .from("traces")
            .select("org_id")
            .eq("id", traceId)
            .single();

        if (traceError || !trace || (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true" && trace.org_id !== orgId)) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        let parsedOverride = null;
        const rawOverride = overridePayload ?? overrideJson;
        if (rawOverride && typeof rawOverride === "string") {
            try { parsedOverride = JSON.parse(rawOverride); } catch (e) { }
        } else if (rawOverride && typeof rawOverride === "object") {
            parsedOverride = rawOverride;
        }

        // Try remote engine if available
        if (isRemoteEngineConfigured()) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const enginePayload = {
                    trace_id: traceId,
                    fork_step: forkStep,
                    override: parsedOverride,
                    name: name,
                };
                const engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/branches/create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(enginePayload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (engineResponse.ok) {
                    const result = await engineResponse.json();
                    return NextResponse.json(result);
                }
            } catch (err) {
                console.warn("[branches POST] Remote engine failed, falling back to serverless creation:", err);
            }
        }

        // Serverless branch creation directly in Supabase
        const events = await fetchTraceEvents(supabaseAdmin, traceId);
        const parentHash = computeCausalHash(events, forkStep);
        const branchName = name || `fork-step-${forkStep}`;
        const branchId = crypto.randomUUID();
        const forkEvents = events.filter((e: any) => (e.seq ?? 0) <= forkStep);

        const overridesPayload: Record<string, any> = {
            _parent_hash: parentHash,
            _fork_events_count: forkEvents.length,
        };
        if (parsedOverride) {
            overridesPayload._override = { [String(forkStep)]: parsedOverride };
        }

        const branchRecord: Record<string, any> = {
            id: branchId,
            trace_id: traceId,
            org_id: orgId,
            fork_step: forkStep,
            name: branchName,
            overrides: overridesPayload,
        };

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("branches")
            .insert(branchRecord)
            .select()
            .single();

        if (insertError) {
            console.error("[branches POST] Failed to insert branch:", insertError);
            throw new Error(`Failed to save branch: ${insertError.message}`);
        }

        return NextResponse.json({
            success: true,
            branchId,
            parentTraceId: traceId,
            forkStep,
            parentHash,
            name: branchName,
            forkEventCount: forkEvents.length,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
