#!/usr/bin/env python3
"""
AgentTrace CLI - Flight recorder & deterministic replay tooling for AI Agents.
"""

import sys
import os
import argparse
import json
import time
import requests
from typing import Optional, List, Dict, Any

try:
    from .config import Config, init
    from .validator import validate_trace_integrity, TraceIntegrityError
    from .signer import sign_trace
except ImportError:
    from agenttrace.config import Config, init
    from agenttrace.validator import validate_trace_integrity, TraceIntegrityError
    from agenttrace.signer import sign_trace

VERSION = "0.1.2"

def print_banner():
    banner = r"""
   ___                    __ ______                    
  / _ | ___ ____ ___  ___/ //_  __/____ ___ _ ____ ___ 
 / __ |/ _ `/ -_) _ \/ _  /  / /  / __// _ `// __// -_)
/_/ |_|\_, /\__/_//_/\_,_/  /_/  /_/   \_,_/ \__/ \__/ 
      /___/                                            
    Deterministic Flight Recorder & Sandbox for AI Agents
    """
    print(banner)

def load_environment():
    """Load environment variables from .env or .env.local if present."""
    for env_file in [".env", ".env.local", "../.env", "../.env.local"]:
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            val = val.strip().strip("'\"")
                            if key not in os.environ:
                                os.environ[key] = val
                break
            except Exception:
                pass

def format_event_badge(event_type: str) -> str:
    badges = {
        "agent_start": "🚀 START",
        "llm_start": "🤖 LLM PROMPT",
        "llm_call": "🤖 LLM CALL",
        "llm_completion": "✨ LLM COMPLETE",
        "tool_call": "🔧 TOOL CALL",
        "tool_result": "📥 TOOL RESULT",
        "network_call": "🌐 HTTP I/O",
        "error": "❌ ERROR",
        "agent_complete": "🏁 FINISH",
    }
    return badges.get(event_type, f"⚡ {event_type.upper()}")

def cmd_replay(args):
    """Replay a recorded trace or inspect timeline."""
    load_environment()
    trace_id = args.trace_id or args.session
    if not trace_id:
        print("[AgentTrace Error] Missing trace ID. Usage: agenttrace replay <trace_id>")
        return 1

    api_url = args.api_url or os.environ.get("AGENTTRACE_API_URL", "https://www.theagenttrace.com/api").rstrip("/")
    api_key = args.api_key or os.environ.get("AGENTTRACE_API_KEY", "")

    print(f"\n🔍 [AgentTrace Replay] Fetching trace: {trace_id}")
    if args.branch:
        print(f"🔀 Branch: {args.branch}")
    if args.step is not None:
        print(f"🎯 Target Step: {args.step}")

    events = []
    # 1. Try local file if trace_id is a JSON file
    if os.path.exists(trace_id):
        try:
            with open(trace_id, "r", encoding="utf-8") as f:
                data = json.load(f)
                events = data if isinstance(data, list) else data.get("events", [])
            print(f"📂 Loaded {len(events)} events from local file: {trace_id}")
        except Exception as e:
            print(f"[AgentTrace Error] Failed reading local file: {e}")
            return 1
    else:
        # 2. Fetch from Cloud API
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        endpoint = f"{api_url}/replay" if args.branch else f"{api_url}/trace/events?traceId={trace_id}"
        try:
            if args.branch:
                resp = requests.post(endpoint, json={"traceId": trace_id, "branch": args.branch}, headers=headers, timeout=15)
            else:
                resp = requests.get(endpoint, headers=headers, timeout=15)

            if resp.status_code == 200:
                data = resp.json()
                events = data.get("events", [])
                print(f"☁️  Retrieved {len(events)} events from AgentTrace Cloud API")
            else:
                print(f"[AgentTrace Warning] Cloud fetch returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[AgentTrace Warning] Cloud fetch unreachable ({e}). Checking local trace storage...")

    if not events:
        print(f"[AgentTrace Error] No events found for trace '{trace_id}'.")
        return 1

    try:
        validate_trace_integrity(events)
    except TraceIntegrityError as err:
        print(f"⚠️  Trace Integrity Notice: {err}")

    # Display Causal Timeline
    print("\n" + "=" * 65)
    print(f"  CAUSAL TIMELINE FOR TRACE: {trace_id}")
    print("=" * 65)

    max_step = args.step if args.step is not None else len(events) - 1
    for i, ev in enumerate(events):
        seq = ev.get("seq", i)
        if seq > max_step:
            break
        badge = format_event_badge(ev.get("type", "generic"))
        payload = ev.get("payload", {})
        summary = ""
        if "model" in payload:
            summary = f"model={payload['model']}"
        elif "tool" in payload:
            summary = f"tool={payload['tool']} args={json.dumps(payload.get('arguments', {}))[:40]}"
        elif "method" in payload and "url" in payload:
            summary = f"{payload['method']} {payload['url']}"
        elif "status" in payload:
            summary = f"status={payload['status']}"
        elif "decision" in payload:
            summary = f"decision={payload['decision']}"

        marker = "▶" if seq == args.step else " "
        print(f"{marker} Step {seq:02d} | {badge:<16} | {summary}")

    print("=" * 65)

    if args.run:
        script_path = args.run
        if not os.path.exists(script_path):
            print(f"[AgentTrace Error] Script not found: {script_path}")
            return 1

        print(f"\n🚀 [Deterministic Execution Sandbox] Running '{script_path}' against trace {trace_id}...")
        init(mode="replay", replay_events=events, governance_level="relaxed")

        script_dir = os.path.dirname(os.path.abspath(script_path))
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)

        with open(script_path, "r", encoding="utf-8") as f:
            code = compile(f.read(), script_path, "exec")
            exec(code, {"__name__": "__main__", "__file__": script_path})

        print("✅ Replay execution complete.")

    return 0

def cmd_verify(args):
    """Verify deterministic execution by executing a script twice and comparing fingerprints."""
    load_environment()
    script_path = args.script
    if not os.path.exists(script_path):
        print(f"[AgentTrace Error] Script not found: {script_path}")
        return 1

    runs = max(args.runs, 2)
    print_banner()
    print(f"🧪 [Determinism Verification Engine]")
    print(f"Script: {script_path}")
    print(f"Comparing {runs} isolated execution runs...\n")

    import subprocess
    import hashlib

    outputs = []
    for r in range(1, runs + 1):
        print(f"  → Running execution #{r}...")
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[AgentTrace Error] Run #{r} failed with exit code {res.returncode}:\n{res.stderr}")
            return 1
        digest = hashlib.sha256(res.stdout.strip().encode("utf-8")).hexdigest()
        outputs.append((digest, res.stdout.strip()))
        print(f"    State Digest: {digest[:16]}...")

    digests = [o[0] for o in outputs]
    if len(set(digests)) == 1:
        print("\n" + "=" * 65)
        print("✅ SUCCESS: 100% Determinism Verified Across All Runs.")
        print(f"Causal Fingerprint: {digests[0]}")
        print("=" * 65)
        return 0
    else:
        print("\n" + "=" * 65)
        print("❌ FAILURE: Non-deterministic drift detected between runs!")
        for i, d in enumerate(digests, 1):
            print(f"  Run #{i}: {d}")
        print("=" * 65)
        return 1

def main():
    parser = argparse.ArgumentParser(
        prog="agenttrace",
        description="AgentTrace CLI - Flight recorder & deterministic replay tooling for AI Agents",
    )
    parser.add_argument("-v", "--version", action="version", version=f"AgentTrace CLI v{VERSION}")

    subparsers = parser.add_subparsers(dest="command", help="AgentTrace commands")

    # Replay command
    replay_parser = subparsers.add_parser("replay", help="Replay a trace or step through execution timeline")
    replay_parser.add_argument("trace_id", nargs="?", default=None, help="Trace ID to replay")
    replay_parser.add_argument("--session", dest="session", help="Trace/Session ID alias")
    replay_parser.add_argument("--step", type=int, help="Jump to specific step number")
    replay_parser.add_argument("--branch", help="Multiverse branch ID override")
    replay_parser.add_argument("--api-key", help="AgentTrace API Key (defaults to AGENTTRACE_API_KEY)")
    replay_parser.add_argument("--api-url", help="AgentTrace API URL")
    replay_parser.add_argument("--run", help="Path to Python script to execute with intercepted replay")

    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Verify determinism of an agent script")
    verify_parser.add_argument("script", help="Path to Python agent script")
    verify_parser.add_argument("--runs", type=int, default=2, help="Number of test iterations (default: 2)")

    args = parser.parse_args()

    if not args.command:
        print_banner()
        parser.print_help()
        return 0

    if args.command == "replay":
        return cmd_replay(args)
    elif args.command == "verify":
        return cmd_verify(args)

    return 0

if __name__ == "__main__":
    sys.exit(main())
