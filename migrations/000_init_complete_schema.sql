-- ==============================================================================
-- AGENTTRACE MASTER SUPABASE SCHEMA MIGRATION
-- Run this in the Supabase SQL Editor for instant 1-click deployment.
-- Idempotent (safe to run multiple times).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. ORGANIZATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. ORG MEMBERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'dev', 'viewer')),
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.org_members(org_id);

-- ─── 3. INVITES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('dev', 'viewer')),
    token_hash TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    used_at TIMESTAMPTZ,
    UNIQUE(org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

-- ─── 4. API KEYS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default Key',
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['ingest', 'replay', 'read'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(org_id);

-- ─── 5. TRACES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.traces (
    id TEXT PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    priority TEXT DEFAULT NULL CHECK (priority IS NULL OR priority IN ('red', 'yellow', 'green')),
    step_count INTEGER NOT NULL DEFAULT 0,
    root_hash TEXT,
    parent_trace_id TEXT,
    fork_step INTEGER,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_traces_org ON public.traces(org_id);
CREATE INDEX IF NOT EXISTS idx_traces_created ON public.traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_active ON public.traces(org_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_traces_deleted ON public.traces(deleted_at) WHERE deleted_at IS NOT NULL;

-- Trigger: auto-update traces.updated_at
CREATE OR REPLACE FUNCTION update_traces_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS traces_updated_at ON public.traces;
CREATE TRIGGER traces_updated_at
    BEFORE UPDATE ON public.traces
    FOR EACH ROW
    EXECUTE FUNCTION update_traces_timestamp();

-- ─── 6. TRACE EVENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trace_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL REFERENCES public.traces(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id ON public.trace_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id_seq ON public.trace_events(trace_id, seq);

-- ─── 7. SPANS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spans (
    span_id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL REFERENCES public.traces(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_span_id TEXT,
    name TEXT NOT NULL,
    kind TEXT DEFAULT 'internal',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    attributes JSONB DEFAULT '{}'::JSONB,
    metrics JSONB DEFAULT '{}'::JSONB
);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON public.spans(trace_id);

-- ─── 8. MULTIVERSE BRANCHES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    trace_id TEXT,
    parent_trace_id TEXT,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    fork_step INTEGER NOT NULL DEFAULT 0,
    name TEXT,
    overrides JSONB DEFAULT '{}'::JSONB,
    override_payload JSONB,
    parent_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_trace_id ON public.branches(trace_id);
CREATE INDEX IF NOT EXISTS idx_branches_parent_trace ON public.branches(parent_trace_id);
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(org_id);

-- ─── 9. JOBS QUEUE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL DEFAULT 'replay',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'processing', 'completed', 'failed')),
    payload JSONB DEFAULT '{}'::JSONB,
    worker_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_trace ON public.jobs(trace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

-- ─── 10. AFE CANDIDATES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.afe_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    fix_type TEXT,
    fix_explanation TEXT,
    diff_payload TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 11. SCHEDULES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cron TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 12. WAITLIST SIGNUPS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role TEXT,
    company TEXT,
    referral TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON public.waitlist_signups(email);

-- ─── ROW LEVEL SECURITY (RLS) & GRANTS ────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afe_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Service Role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Authenticated Users access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.waitlist_signups TO anon;
GRANT SELECT ON public.traces TO anon;
GRANT SELECT ON public.trace_events TO anon;

-- Storage buckets setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('traces', 'traces', true)
ON CONFLICT (id) DO NOTHING;
