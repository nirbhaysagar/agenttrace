import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");

interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  company?: string;
  framework?: string;
  useCase?: string;
  position: number;
  referralCode: string;
  createdAt: string;
}

function getLocalWaitlist(): WaitlistEntry[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("[Waitlist] Failed to read local file:", e);
  }
  return [];
}

function saveLocalWaitlist(entries: WaitlistEntry[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (e) {
    console.error("[Waitlist] Failed to write local file:", e);
  }
}

async function syncToSupabaseStorage(entries: WaitlistEntry[]) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const buffer = Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
    await supabase.storage.from("traces").upload("_waitlist/submissions.json", buffer, {
      contentType: "application/json",
      upsert: true,
    });
  } catch (e) {
    console.warn("[Waitlist] Supabase storage sync non-fatal warning:", e);
  }
}

export async function GET() {
  const list = getLocalWaitlist();
  // Return public aggregate statistics
  return NextResponse.json({
    total: 128 + list.length, // Initial seed + organic signups
    recentFrameworks: ["LangChain", "CrewAI", "AutoGen", "LlamaIndex", "Custom Python"],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const list = getLocalWaitlist();
    const existingIndex = list.findIndex(item => item.email === email);

    if (existingIndex !== -1) {
      const existing = list[existingIndex];
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        position: existing.position,
        referralCode: existing.referralCode,
        message: `You're already on the list at position #${existing.position}!`,
      });
    }

    const basePosition = 128;
    const position = basePosition + list.length + 1;
    const referralCode = `AT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newEntry: WaitlistEntry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      name: body.name ? String(body.name).trim() : undefined,
      company: body.company ? String(body.company).trim() : undefined,
      framework: body.framework ? String(body.framework).trim() : undefined,
      useCase: body.useCase ? String(body.useCase).trim() : undefined,
      position,
      referralCode,
      createdAt: new Date().toISOString(),
    };

    list.push(newEntry);
    saveLocalWaitlist(list);

    // Asynchronously sync snapshot to cloud storage
    syncToSupabaseStorage(list).catch(() => {});

    return NextResponse.json({
      success: true,
      position,
      referralCode,
      message: `You're in! You are #${position} on the priority waitlist.`,
    });
  } catch (err: any) {
    console.error("[Waitlist] Submission error:", err);
    return NextResponse.json(
      { error: "Failed to process waitlist request. Please try again." },
      { status: 500 }
    );
  }
}
