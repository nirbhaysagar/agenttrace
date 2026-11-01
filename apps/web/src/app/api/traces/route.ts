import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAuth } from "@/lib/api-auth";

/**
 * GET /api/traces
 * Returns traces for the authenticated org, bypassing RLS safely via service role.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await resolveAuth(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const query = supabaseAdmin
            .from("traces")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (process.env.NEXT_PUBLIC_SKIP_AUTH !== "true") {
            query.eq("org_id", auth.orgId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ traces: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
