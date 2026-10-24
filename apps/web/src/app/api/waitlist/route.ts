import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");
const TMP_FILE = path.join("/tmp", "agenttrace-waitlist.json");

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
  for (const filePath of [DATA_FILE, TMP_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch {}
  }
  return [];
}

function saveLocalWaitlist(entries: WaitlistEntry[]): void {
  // Try writing to project data dir first, fallback to /tmp on serverless
  for (const filePath of [DATA_FILE, TMP_FILE]) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
      return;
    } catch (e) {
      // Continue to next path
    }
  }
}

async function sendWebhookNotification(entry: WaitlistEntry) {
  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    let payload: any;
    if (webhookUrl.includes("discord.com/api/webhooks")) {
      // Rich Discord Embed
      payload = {
        username: "AgentTrace Waitlist",
        avatar_url: "https://agenttrace.com/favicon.ico",
        embeds: [
          {
            title: `🚀 New Waitlist Signup #${entry.position}`,
            color: 0x000000,
            fields: [
              { name: "Email", value: entry.email, inline: true },
              { name: "Company / Role", value: entry.company || "Not provided", inline: true },
              { name: "Framework", value: entry.framework || "Not provided", inline: true },
              { name: "Pain / Use Case", value: entry.useCase || "Not provided", inline: false },
              { name: "Referral Code", value: `\`${entry.referralCode}\``, inline: true },
            ],
            footer: { text: "AgentTrace Deterministic Flight Recorder" },
            timestamp: entry.createdAt,
          },
        ],
      };
    } else if (webhookUrl.includes("hooks.slack.com")) {
      // Slack message format
      payload = {
        text: `🚀 *New AgentTrace Waitlist Signup #${entry.position}*\n• *Email:* ${entry.email}\n• *Company:* ${entry.company || 'N/A'}\n• *Framework:* ${entry.framework || 'N/A'}\n• *Use Case:* ${entry.useCase || 'N/A'}`,
      };
    } else {
      // Generic Webhook format (Zapier, Make, n8n, Custom endpoint)
      payload = {
        event: "waitlist.signup",
        ...entry,
      };
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[Waitlist] Webhook notification warning:", err);
  }
}

async function syncToSupabaseStorage(entries: WaitlistEntry[], latestEntry?: WaitlistEntry) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Try inserting single row into waitlist table if it exists
    if (latestEntry) {
      try {
        await supabase.from("waitlist_signups").insert({
          email: latestEntry.email,
          name: latestEntry.name,
          company: latestEntry.company,
          framework: latestEntry.framework,
          use_case: latestEntry.useCase,
          position: latestEntry.position,
          referral_code: latestEntry.referralCode,
        });
      } catch {}
    }

    // 2. Sync full snapshot to Storage bucket
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

    // Asynchronously dispatch webhook notification and sync to cloud storage
    Promise.all([
      sendWebhookNotification(newEntry),
      syncToSupabaseStorage(list, newEntry),
    ]).catch(() => {});

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
