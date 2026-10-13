# AgentTrace (Moat 2.0) — Complete System Architecture & Product Breakdown

---

## 1. Executive Summary & What It Does

**AgentTrace** is a **Deterministic Observability, Time-Travel Debugging, and Governance Platform for Autonomous AI Agents**.

Unlike traditional loggers or LLM monitors that simply record strings and latency metrics, AgentTrace captures the **complete causal state** of an agent's execution. It records every external interaction—including LLM calls, third-party HTTP requests, random seeds, system clocks, and file system reads/writes. 

Using this recorded state, AgentTrace enables:
1. **Deterministic Replay**: Re-running an agent locally or in a sandbox so that it behaves *identically* to the original run without re-hitting external APIs or paying for re-generated LLM tokens.
2. **Counterfactual Branching ("The Multiverse")**: Allowing developers to select any step in a historical execution, alter an input (e.g. mock an API error or change an LLM output), and "fork reality" to see how the agent would have reacted downstream.
3. **Strict Governance & Sandboxing**: Enforcing strict zero-leak policies where any unrecorded network I/O, DNS call, or disk access causes an immediate execution halt.
4. **AutoFix Engine (AFE)**: Automatically diagnosing agent runtime failures and generating code patches using root-cause analysis and LLMs.

---

## 2. Directory & Component Architecture

```
agent-trace/
├── packages/
│   ├── python-sdk/          # Python library installed in user agents (agenttrace-py)
│   └── shared/              # Shared TypeScript schemas, types, and DB interfaces
├── apps/
│   ├── backend/             # FastAPI Sandbox & Replay Execution Engine
│   ├── web/                 # Next.js 16 Multiverse UI (Dashboard & Visual Diff)
│   └── worker/              # Background job processor & AutoFix Engine runner
├── agenttrace/              # Core SDK logic, Virtual File System (VFS), & AFE modules
├── docker/governance/       # Hardened Docker container for zero-leak sandbox execution
├── migrations/              # Supabase / PostgreSQL schema migrations
├── scripts/                 # Integration tests, automated seed scripts, and audits
└── root tests               # Test harnesses for determinism, forks, chaos, and isolation
```

### Component Roles

* **Python SDK (`packages/python-sdk/` & `agenttrace/`)**:
  - Implements the **Deterministic Interceptor** using Python monkey-patching and decorators (`@agenttrace.run`, `@agenttrace.step`).
  - Intercepts `urllib3`, `requests`, `random`, `time`, and file operations (`open`, `os.listdir`).
  - Operates in three modes: **RECORD** (captures inputs/outputs), **REPLAY** (mocks external interactions from trace), and **GOVERNANCE** (kills process on unrecorded I/O).

* **Execution Engine (`apps/backend/`)**:
  - A FastAPI server that handles sandbox execution and counterfactual forks.
  - Downloads source code and recorded trace events from Supabase.
  - Injects user overrides at designated `fork_step`s and runs the agent in an isolated subprocess.
  - Computes a cryptographic **SHA-256 Causal Fingerprint** to mathematically verify whether execution stayed deterministic or diverged.

* **Multiverse UI (`apps/web/`)**:
  - A Next.js 14/16 dashboard built with Tailwind CSS and Radix UI.
  - Provides a visual step-by-step timeline of an agent's thoughts, tool calls, and actions.
  - Allows one-click "Forking" where developers can test alternative inputs at any step.
  - Includes a visual comparison engine to diff two branches side-by-side.

* **AutoFix Engine Worker (`apps/worker/` & `agenttrace/afe/`)**:
  - A TypeScript background worker connected to Supabase job queues.
  - When an agent run fails, it activates the AutoFix Engine (AFE).
  - Performs Root Cause Analysis (RCA) and prompts Groq LLMs to propose code patches to repair the agent.

* **Governance Sandbox (`docker/governance/` & `docker-compose.governance.yml`)**:
  - A hardened container environment that restricts host resource usage and cuts off external network egress.
  - Ensures compliance by guaranteeing agent code cannot perform unauthorized side effects during audits.

---

## 3. The Core Pain Points & Daily Problems We Solve

### The Main Problem: The Non-Deterministic "Black Box"
Developing software with autonomous AI agents is fundamentally different from traditional software engineering:
* **The "Flaky Bug" Nightmare**: An agent fails on step 37 of a complex task. When the developer runs it again with print statements, the LLM gives a slightly different response on step 2, sending the agent down an entirely different code path. The original bug disappears or cannot be reproduced.
* **Costly & Slow Iteration**: Debugging step 40 of an agent typically requires paying for and waiting through steps 1 to 39 every single time.
* **Silent Drift & Regression**: Updating an agent prompt or swapping an underlying model might improve one task while silently breaking 15 other workflows.
* **Security & Enterprise Hesitation**: Enterprises are terrified of giving autonomous agents access to APIs, databases, or local shells because there is no safety boundary guaranteeing what the agent can or cannot do when things go off the rails.

### How AgentTrace Tackles It
1. **Causal Lockdown**: Everything external that enters the agent process is saved into a sequential event log.
2. **Instant, Zero-Cost Replay**: Replaying an execution costs \$0 in LLM fees and runs near-instantaneously because external calls return pre-recorded responses.
3. **Time-Travel "What-If" Exploration**: Developers can test prompt adjustments or error scenarios at step 20 without re-running steps 1–19 from scratch.
4. **Cryptographic Fingerprinting**: Any variation between runs is detected via SHA-256 event hashing.

---

## 4. Competitive Landscape & How to Win

### Existing Market Tools

| Category | Representative Tools | What They Do Well | Where They Fall Short |
| :--- | :--- | :--- | :--- |
| **LLM Observability / Tracing** | **LangSmith**, **Arize Phoenix**, **Braintrust**, **AgentOps** | Great at logging prompt text, token usage, latency, and LLM evaluation scores. | **Passive telemetry only.** They cannot re-execute your agent code, mock OS/network primitives, or perform deterministic replays. If you rerun, you make live LLM calls and risk drift. |
| **Cloud Agent Sandboxes** | **E2B**, **Modal**, **Fly Machines** | Provide isolated Linux virtual machines / containers to run untrusted agent code. | **Compute only.** They don't have causal state capture, event interception, or step-by-step time-travel branching. |
| **Classical Time-Travel Debuggers** | **rr**, **Undo**, **Replay.io** | Record and replay machine code / JavaScript instructions deterministically. | Built for classical deterministic bugs; completely unaware of LLM semantics, prompt chains, token budgets, or AI agent tool abstractions. |

### How AgentTrace Outruns the Competition

1. **Active Execution Layer vs. Passive Loggers**:
   - Competitors are glorified log aggregators. AgentTrace is an **active execution engine**. It doesn't just show you what happened; it lets you jump in, change a variable, and run an alternative future.
2. **The "Multiverse" Differentiator**:
   - No existing tool allows you to branch an agent's execution mid-flight and produce side-by-side behavioral diffs without re-invoking real APIs.
3. **Zero-Token Regression Testing**:
   - Because traces can be replayed deterministically from cached inputs, teams can run regression test suites of 1,000 historical agent executions in CI/CD without spending a penny on LLM API tokens.
4. **Self-Healing Agents (AFE)**:
   - By marrying deterministic traces with root cause analysis and automated patch generation, AgentTrace turns passive error logs into automated pull requests.
