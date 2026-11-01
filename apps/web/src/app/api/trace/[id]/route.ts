import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAuth } from "@/lib/api-auth";

/**
 * GET /api/trace/[id]
 *
 * Returns trace record + metadata, with org isolation enforced server-side.
 * Auth: JWT from browser session (bypassed if NEXT_PUBLIC_SKIP_AUTH=true).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        if (!traceId) {
            return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
        }

        // 1. Auth — resolve user from JWT or skip-auth dev mock
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch trace with org filter
        const traceQuery = supabaseAdmin.from("traces").select("*").eq("id", traceId);
        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
            traceQuery.eq("org_id", auth.orgId);
        }
        const { data: traceData, error: traceError } = await traceQuery.single();

        if (traceError || !traceData) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        // 4. Build metadata from DB record
        const metadata = {
            title: traceData.title || "",
            source: (traceData.metadata as any)?.source || "api",
            status: traceData.status || "completed",
            runtime: (traceData.metadata as any)?.runtime || "Python_3.x",
            created_at: traceData.created_at,
            script_path: (traceData.metadata as any)?.script_path || null,
        };

        // 5. Enrich with Storage metadata.json (Python SDK traces only)
        const source = (traceData.metadata as any)?.source;
        if (source === "python_sdk" || source === "sdk") {
            try {
                const { data: metaFile, error: metaError } = await supabaseAdmin.storage
                    .from("traces")
                    .download(`${traceId}/metadata.json`);

                if (!metaError && metaFile) {
                    const parsed = JSON.parse(await metaFile.text());
                    Object.assign(metadata, parsed);
                }
            } catch {
                // Storage not available — DB metadata is sufficient
            }
        }

        // 6. Fetch source code (script.py) from Storage — needed by fork dialog
        try {
            const { data: scriptFile, error: scriptError } = await supabaseAdmin.storage
                .from("traces")
                .download(`${traceId}/script.py`);

            if (!scriptError && scriptFile) {
                (metadata as any).script_content = await scriptFile.text();
            }
        } catch {
            // No script available — that's fine
        }

        // 7. Resolve audit trail user info
        const audit: Record<string, any> = {
            updated_at: traceData.updated_at || null,
        };

        const userIds = [traceData.created_by, traceData.updated_by].filter(Boolean);
        if (userIds.length > 0) {
            const uniqueIds = [...new Set(userIds)];
            const userMap: Record<string, string> = {};
            for (const uid of uniqueIds) {
                const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(uid);
                if (u) userMap[uid] = u.email || uid.slice(0, 8);
            }
            audit.created_by = traceData.created_by ? userMap[traceData.created_by] || null : null;
            audit.updated_by = traceData.updated_by ? userMap[traceData.updated_by] || null : null;
        }

        return NextResponse.json({ trace: traceData, metadata, audit });
    } catch (err: any) {
        console.error("[API] /trace/[id] error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
