import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAuth } from "@/lib/api-auth";

/**
 * PATCH /api/trace/[id]/priority
 * Body: { priority: "red" | "yellow" | "green" | null }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const { priority } = await req.json();

        if (priority !== null && !["red", "yellow", "green"].includes(priority)) {
            return NextResponse.json({ error: "Invalid priority. Use red, yellow, green, or null." }, { status: 400 });
        }

        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const updateQuery = supabaseAdmin
            .from("traces")
            .update({ priority, updated_by: auth.user.id })
            .eq("id", traceId);

        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
            updateQuery.eq("org_id", auth.orgId);
        }

        const { error } = await updateQuery;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[API] /trace/[id]/priority error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
