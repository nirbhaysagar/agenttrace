import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Anon Key is missing. Check your .env file.");
}

function createFrontendClient() {
    const client = createClient(supabaseUrl, supabaseAnonKey);

    if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
        const originalGetSession = client.auth.getSession.bind(client.auth);
        client.auth.getSession = async () => {
            try {
                const res = await originalGetSession();
                if (res?.data?.session) return res;
            } catch (e) {}

            return {
                data: {
                    session: {
                        access_token: "dev-mock-token",
                        token_type: "bearer",
                        expires_in: 86400,
                        refresh_token: "dev-mock-refresh",
                        user: {
                            id: "7d2ac12f-a28a-4964-a109-9f81f7a30f0a",
                            email: "nirbhay@agenttrace.com",
                            aud: "authenticated",
                            role: "authenticated",
                            created_at: "2026-02-19T18:57:30.000Z",
                            app_metadata: {},
                            user_metadata: { full_name: "Nirbhay" },
                        } as any,
                    } as any,
                },
                error: null,
            };
        };

        const originalGetUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = async (jwt?: string) => {
            if (jwt === "dev-mock-token" || !jwt) {
                return {
                    data: {
                        user: {
                            id: "7d2ac12f-a28a-4964-a109-9f81f7a30f0a",
                            email: "nirbhay@agenttrace.com",
                            aud: "authenticated",
                            role: "authenticated",
                            created_at: "2026-02-19T18:57:30.000Z",
                            app_metadata: {},
                            user_metadata: { full_name: "Nirbhay" },
                        } as any,
                    },
                    error: null,
                };
            }
            return originalGetUser(jwt);
        };
    }

    return client;
}

// Ensure singleton client on the frontend
export const supabase = (typeof window !== "undefined")
    ? (window as any)._supabaseInstance || ((window as any)._supabaseInstance = createFrontendClient())
    : createFrontendClient();

// Admin client — server-side only (API routes).
// On the browser this is null; client code must never import supabaseAdmin.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = typeof window === 'undefined'
    ? (() => {
        if (!supabaseServiceRoleKey) {
            console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY is missing! Admin tasks will fail RLS.");
        }
        return createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    })()
    : null as any;
