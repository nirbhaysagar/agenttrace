import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeCausalHash } from "@/lib/replay-simulation";
import { resolveAuth } from "@/lib/api-auth";
import crypto from "crypto";

/**
 * POST /api/trace/seed
 * Generates a realistic sample agent execution trace for onboarding & interactive testing.
 * Protected by user session authentication (bypassed when NEXT_PUBLIC_SKIP_AUTH=true).
 */
export async function POST(req: Request) {
    try {
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { user, orgId } = auth;
        const traceId = crypto.randomUUID();
        const now = new Date();

        const sampleEvents = [
            {
                seq: 0,
                timestamp: new Date(now.getTime() - 2400).toISOString(),
                type: "llm_start",
                payload: {
                    model: "gpt-4o",
                    temperature: 0.0,
                    system_prompt: "You are a customer satisfaction & dispute agent. Determine return eligibility for order #ORD-9842.",
                    user_message: "Customer requesting refund for mechanical keyboard: 'Box opened, no longer needed.'",
                },
            },
            {
                seq: 1,
                timestamp: new Date(now.getTime() - 1900).toISOString(),
                type: "tool_call",
                payload: {
                    tool: "order_lookup",
                    arguments: { order_id: "ORD-9842" },
                    purpose: "Retrieve order dispatch timestamp and payment method",
                },
            },
            {
                seq: 2,
                timestamp: new Date(now.getTime() - 1300).toISOString(),
                type: "tool_result",
                payload: {
                    tool: "order_lookup",
                    output: {
                        item: "Custom mechanical keyboard (Cherry MX Brown)",
                        total_price: 189.99,
                        delivery_date: "2026-10-14",
                        return_window_days: 30,
                        is_within_window: true,
                        condition_reported: "opened",
                    },
                },
            },
            {
                seq: 3,
                timestamp: new Date(now.getTime() - 700).toISOString(),
                type: "tool_call",
                payload: {
                    tool: "compute_restocking_fee",
                    arguments: { original_amount: 189.99, open_box_rate: 0.15 },
                    purpose: "Apply policy clause 4.2 for opened non-defective electronics",
                },
            },
            {
                seq: 4,
                timestamp: now.toISOString(),
                type: "llm_completion",
                payload: {
                    decision: "APPROVED_PARTIAL_REFUND",
                    refund_amount: 161.49,
                    deduction_fee: 28.50,
                    summary: "Order is within standard 30-day window. Deducted standard 15% open-box restocking fee. Refund approved.",
                    status: "completed",
                },
            },
        ];

        const rootHash = computeCausalHash(sampleEvents, sampleEvents.length);

        // 1. Insert Trace
        const { error: traceError } = await supabaseAdmin.from("traces").insert({
            id: traceId,
            org_id: orgId,
            title: "Customer Refund & Policy Validation Agent",
            description: "Automated return evaluation verifying warranty window and restocking fee policy for order #ORD-9842",
            status: "completed",
            priority: "green",
            step_count: sampleEvents.length,
            root_hash: rootHash,
            created_by: user.id,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            metadata: {
                title: "Customer Refund & Policy Validation Agent",
                duration_s: 2.4,
                event_count: sampleEvents.length,
                model: "gpt-4o",
                is_demo: true,
            },
        });

        if (traceError) {
            console.error("[seed] Failed to insert trace:", traceError);
            return NextResponse.json({ error: traceError.message }, { status: 500 });
        }

        // 2. Insert Events
        const dbEvents = sampleEvents.map((ev) => ({
            trace_id: traceId,
            seq: ev.seq,
            timestamp: ev.timestamp,
            type: ev.type,
            payload: ev.payload,
            created_at: ev.timestamp,
        }));

        const { error: eventsError } = await supabaseAdmin.from("trace_events").insert(dbEvents);
        if (eventsError) {
            console.error("[seed] Failed to insert trace events:", eventsError);
        }

        return NextResponse.json({
            success: true,
            traceId,
            title: "Customer Refund & Policy Validation Agent",
            eventCount: sampleEvents.length,
        });

    } catch (e: any) {
        console.error("[seed] Exception:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
