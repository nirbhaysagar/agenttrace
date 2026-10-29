import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchTraceEvents, computeCausalHash } from "@/lib/replay-simulation";
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

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const orgId = membership.org_id;

        const { data: trace, error: traceError } = await supabaseAdmin
            .from("traces")
            .select("org_id")
            .eq("id", traceId)
            .single();

        if (traceError || !trace || trace.org_id !== orgId) {
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
            .or(`trace_id.eq.${traceId},parent_trace_id.eq.${traceId}`)
            .order("created_at", { ascending: false });

        if (branchErr) {
            console.error("[branches GET] Supabase query error:", branchErr);
            return NextResponse.json({ success: true, branches: [] });
        }

        const normalized = (dbBranches || []).map((b: any) => {
            const overrides = b.overrides || {};
            return {
                id: b.id,
                parentTraceId: b.trace_id || b.parent_trace_id,
                forkStep: b.fork_step ?? 0,
                name: b.name || `fork-step-${b.fork_step ?? 0}`,
                parentHash: overrides._parent_hash || b.parent_hash || null,
                createdAt: b.created_at,
                overridePayload: overrides._override || b.override_payload || null,
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

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const orgId = membership.org_id;

        const { data: trace, error: traceError } = await supabaseAdmin
            .from("traces")
            .select("org_id")
            .eq("id", traceId)
            .single();

        if (traceError || !trace || trace.org_id !== orgId) {
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
            parent_trace_id: traceId,
            org_id: orgId,
            fork_step: forkStep,
            name: branchName,
            overrides: overridesPayload,
            override_payload: parsedOverride,
            parent_hash: parentHash,
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
