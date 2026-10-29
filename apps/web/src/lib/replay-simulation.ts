import crypto from "crypto";

export function omitVolatileKeys(event: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(event)) {
        if (k === "timestamp" || k === "timestamp_epoch" || k === "created_at" || k === "id") {
            continue;
        }
        if (k === "payload" && v && typeof v === "object" && !Array.isArray(v)) {
            const cleanPayload: Record<string, any> = {};
            for (const [pk, pv] of Object.entries(v)) {
                if (pk !== "env" && pk !== "argv") {
                    cleanPayload[pk] = pv;
                }
            }
            clean[k] = cleanPayload;
        } else {
            clean[k] = v;
        }
    }
    return clean;
}

export function canonicalJsonStringify(obj: any): string {
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
    }
    const keys = Object.keys(obj).sort();
    const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
    return "{" + entries.join(",") + "}";
}

export function computeCausalHash(events: any[], upToStep: number): string {
    const sorted = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    const filtered: string[] = [];
    for (const ev of sorted) {
        const seq = ev.seq ?? 0;
        if (seq > upToStep) break;
        const clean = omitVolatileKeys(ev);
        filtered.push(canonicalJsonStringify(clean));
    }
    const content = filtered.join("\n");
    return crypto.createHash("sha256").update(content).digest("hex");
}

export async function fetchTraceEvents(supabase: any, traceId: string): Promise<any[]> {
    // 1. Database table query (SDK ingestion)
    try {
        const { data, error } = await supabase
            .from("trace_events")
            .select("*")
            .eq("trace_id", traceId)
            .order("seq", { ascending: true });

        if (!error && data && data.length > 0) {
            return data.map((e: any) => ({
                seq: e.seq,
                timestamp: e.timestamp,
                type: e.type,
                ...e.payload,
                payload: e.payload,
            }));
        }
    } catch (e) {
        console.warn("[fetchTraceEvents] trace_events query error:", e);
    }

    // 2. Supabase Storage fallback (events.jsonl)
    try {
        const { data: blob, error } = await supabase.storage
            .from("traces")
            .download(`${traceId}/events.jsonl`);

        if (!error && blob) {
            const text = await blob.text();
            const events: any[] = [];
            for (const line of text.split("\n")) {
                const trimmed = line.trim();
                if (trimmed) {
                    try {
                        events.push(JSON.parse(trimmed));
                    } catch {}
                }
            }
            events.sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0));
            if (events.length > 0) return events;
        }
    } catch (e) {
        console.warn("[fetchTraceEvents] storage fallback error:", e);
    }

    return [];
}
