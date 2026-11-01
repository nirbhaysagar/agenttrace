import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAuth } from "@/lib/api-auth";

/**
 * POST /api/trace/[id]/trash — Soft delete (move to trash)
 * POST /api/trace/[id]/trash?action=restore — Restore from trash
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const action = req.nextUrl.searchParams.get("action"); // "restore" or null

        // Auth
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true" && !["owner", "admin", "dev"].includes(auth.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        if (action === "restore") {
            // Restore from trash
            const query = supabaseAdmin
                .from("traces")
                .update({ deleted_at: null, updated_by: auth.user.id })
                .eq("id", traceId)
                .not("deleted_at", "is", null);

            if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
                query.eq("org_id", auth.orgId);
            }

            const { error } = await query;

            if (error) {
                console.error("[API] Restore trace error:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "restored" });
        } else {
            // Move to trash (soft delete)
            const query = supabaseAdmin
                .from("traces")
                .update({ deleted_at: new Date().toISOString(), updated_by: auth.user.id })
                .eq("id", traceId)
                .is("deleted_at", null);

            if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
                query.eq("org_id", auth.orgId);
            }

            const { error } = await query;

            if (error) {
                console.error("[API] Trash trace error:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "trashed" });
        }
    } catch (err: any) {
        console.error("[API] /trace/[id]/trash error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/trace/[id]/trash — Permanent deletion (hard delete)
 * Removes trace record + events + storage files. Owner only.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;

        // Auth
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only owners can permanently delete
        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true" && auth.role !== "owner") {
            return NextResponse.json({ error: "Only owners can permanently delete traces" }, { status: 403 });
        }

        // 1. Verify trace is already in trash
        const checkQuery = supabaseAdmin
            .from("traces")
            .select("id, org_id")
            .eq("id", traceId)
            .not("deleted_at", "is", null);

        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
            checkQuery.eq("org_id", auth.orgId);
        }

        const { data: trace, error: traceError } = await checkQuery.single();

        if (traceError || !trace) {
            return NextResponse.json(
                { error: "Trace not found in trash. Only trashed traces can be permanently deleted." },
                { status: 404 }
            );
        }

        // 2. Cascade delete from Storage
        try {
            const { data: files } = await supabaseAdmin.storage
                .from("traces")
                .list(traceId);

            if (files && files.length > 0) {
                const paths = files.map((f: any) => `${traceId}/${f.name}`);
                await supabaseAdmin.storage.from("traces").remove(paths);
            }
        } catch (storageErr) {
            console.warn("[API] Storage cleanup warning:", storageErr);
        }

        // 3. Delete trace events
        await supabaseAdmin
            .from("trace_events")
            .delete()
            .eq("trace_id", traceId);

        // 4. Hard delete trace record
        const { error: deleteError } = await supabaseAdmin
            .from("traces")
            .delete()
            .eq("id", traceId);

        if (deleteError) {
            console.error("[API] Permanent delete error:", deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: "deleted_permanently" });
    } catch (err: any) {
        console.error("[API] /trace/[id]/trash DELETE error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
