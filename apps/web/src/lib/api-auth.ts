import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export const DEV_MOCK_USER = {
    id: "7d2ac12f-a28a-4964-a109-9f81f7a30f0a",
    email: "nirbhay@agenttrace.com",
    name: "Nirbhay",
    organizationId: "6cb9b31b-1678-4395-95b4-71caa628f94e",
    role: "owner" as const,
};

export interface ResolvedAuth {
    user: { id: string; email?: string };
    orgId: string;
    role: "owner" | "dev" | "viewer";
}

/**
 * Resolves user identity and org membership from request headers.
 * Supports NEXT_PUBLIC_SKIP_AUTH=true for instant local development without login.
 */
export async function resolveAuth(req: Request): Promise<ResolvedAuth | null> {
    const isSkipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

    if (!authHeader) {
        if (isSkipAuth) {
            return {
                user: { id: DEV_MOCK_USER.id, email: DEV_MOCK_USER.email },
                orgId: DEV_MOCK_USER.organizationId,
                role: DEV_MOCK_USER.role,
            };
        }
        return null;
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (token === "dev-mock-token" || (isSkipAuth && (!token || token === "null" || token === "undefined"))) {
        return {
            user: { id: DEV_MOCK_USER.id, email: DEV_MOCK_USER.email },
            orgId: DEV_MOCK_USER.organizationId,
            role: DEV_MOCK_USER.role,
        };
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
        });

        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);
        if (authError || !user) {
            if (isSkipAuth) {
                return {
                    user: { id: DEV_MOCK_USER.id, email: DEV_MOCK_USER.email },
                    orgId: DEV_MOCK_USER.organizationId,
                    role: DEV_MOCK_USER.role,
                };
            }
            return null;
        }

        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            if (isSkipAuth) {
                return {
                    user: { id: user.id, email: user.email },
                    orgId: DEV_MOCK_USER.organizationId,
                    role: "owner",
                };
            }
            return null;
        }

        return {
            user: { id: user.id, email: user.email },
            orgId: membership.org_id,
            role: (membership.role as "owner" | "dev" | "viewer") || "viewer",
        };
    } catch (e) {
        if (isSkipAuth) {
            return {
                user: { id: DEV_MOCK_USER.id, email: DEV_MOCK_USER.email },
                orgId: DEV_MOCK_USER.organizationId,
                role: DEV_MOCK_USER.role,
            };
        }
        return null;
    }
}
