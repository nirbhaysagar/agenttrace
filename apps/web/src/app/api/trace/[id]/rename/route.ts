import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAuth } from "@/lib/api-auth";

/**
 * PATCH /api/trace/[id]/rename
 * Body: { title: string }
 * Updates trace title + sets updated_by to the current user.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const { title } = await req.json();

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Auth
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only owners and devs can rename
        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true" && !["owner", "admin", "dev"].includes(auth.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Update
        const updateQuery = supabaseAdmin
            .from("traces")
            .update({ title: title.trim(), updated_by: auth.user.id })
            .eq("id", traceId);

        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
            updateQuery.eq("org_id", auth.orgId);
        }

        const { data, error } = await updateQuery.select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, trace: data });
    } catch (err: any) {
        console.error("[API] /trace/[id]/rename error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
