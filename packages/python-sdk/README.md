# AgentTrace Python SDK (`agenttrace-py`)

[![PyPI version](https://img.shields.io/pypi/v/agenttrace-py.svg)](https://pypi.org/project/agenttrace-py/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **The Deterministic Flight Recorder & Time-Travel Debugger for AI Agents.**

Stop guessing why autonomous agents fail at step 42 in production. AgentTrace records every LLM completion, external tool I/O, timestamp, and random seed with `< 5ms` overhead—letting you replay any agent execution deterministically with **zero token cost** and **zero duplicate side-effects**.

---

## Installation

```bash
# Core lightweight flight recorder (< 5MB, zero heavy dependencies)
pip install agenttrace-py

# With LangChain support
pip install "agenttrace-py[langchain]"

# With OpenAI auto-instrumentation
pip install "agenttrace-py[openai]"

# Install all integrations
pip install "agenttrace-py[all]"
```

---

## 1. Quickstart: Core Flight Recorder

Wrap your agent entry point with `@agenttrace.run` and record critical steps with `with agenttrace.step(...)`:

```python
import agenttrace

# 1. Initialize with your API Key
agenttrace.init(api_key="at_live_your_key_here")

# 2. Decorate your main agent loop
@agenttrace.run(name="refund_processor")
def process_refund(order_id: str, amount: float):
    # 3. Log thoughts, observations, or tool executions
    with agenttrace.step("Eligibility Check", type="thought"):
        is_eligible = amount <= 500.0
        agenttrace.set_result({"eligible": is_eligible})

    with agenttrace.step("Stripe Refund Call", type="tool_call", input={"order_id": order_id, "amount": amount}):
        # External HTTP calls (requests, urllib3, httpx) are automatically captured
        refund_status = "processed"
        agenttrace.set_result({"status": refund_status, "txn_id": "TXN_9876"})

    return {"success": True, "order_id": order_id}

if __name__ == "__main__":
    process_refund("ORD-1042", 150.0)
```

Both synchronous and `async def` agent functions are natively supported.

---

## 2. Framework Integrations

### LangChain & LangGraph
Use `AgentTraceCallbackHandler` to automatically log prompts, model outputs, tool actions, and token counts without manual instrumentation:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agenttrace.integrations.langchain import AgentTraceCallbackHandler
import agenttrace

agenttrace.init(api_key="at_live_...")

@agenttrace.run(name="langchain_researcher")
def run():
    handler = AgentTraceCallbackHandler()
    llm = ChatOpenAI(model="gpt-4o", callbacks=[handler])
    
    prompt = ChatPromptTemplate.from_template("Explain {topic} in one sentence.")
    chain = prompt | llm
    return chain.invoke({"topic": "deterministic replay"}, config={"callbacks": [handler]})

run()
```

### OpenAI SDK
Auto-instrument OpenAI clients so chat completions automatically capture prompt token usage and assistant responses:

```python
import openai
import agenttrace
from agenttrace.integrations.openai import patch_openai

agenttrace.init(api_key="at_live_...")
client = openai.OpenAI()
patch_openai(client)

@agenttrace.run(name="openai_assistant")
def chat():
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "What is 2 + 2?"}]
    )
    return response.choices[0].message.content

chat()
```

---

## 3. Deterministic Offline Replay (Zero Token Cost)

Replay any recorded trace locally or in your CI/CD test suite without hitting the internet or paying for new LLM tokens:

```python
import agenttrace

# Load events from previous trace JSON or API
recorded_events = [...] 

agenttrace.init(
    api_key="at_live_...",
    mode="replay",
    replay_events=recorded_events,
    governance_level="governance" # Enforce strict closed-world determinism
)

@agenttrace.run(name="refund_processor")
def process_refund(order_id: str, amount: float):
    # During replay:
    # 1. time.time() matches the recorded epoch
    # 2. random PRNG sequence matches the original seed
    # 3. HTTP calls return recorded payloads without touching live APIs
    ...

process_refund("ORD-1042", 150.0)
```

Or replay via environment variables:

```bash
AGENTTRACE_MODE=replay \
AGENTTRACE_REPLAY_EVENTS_FILE=./trace_dump.json \
python agent.py
```

---

## 4. Governance Levels

| Governance Level | Behavior on Unrecorded I/O | Recommended Use Case |
| :--- | :--- | :--- |
| `"relaxed"` (default) | Logs a warning, permits call through | Local interactive experimentation |
| `"governance"` | Raises `DeterminismLeakError` or `ReplayMismatchError`, halting process | Production CI/CD regression verification |

---

## 5. Environment Variables Reference

| Variable | Description |
| :--- | :--- |
| `AGENTTRACE_API_KEY` | Authentication key (`at_live_...`) |
| `AGENTTRACE_API_URL` | Telemetry endpoint (default: `https://www.theagenttrace.com/api`) |
| `AGENTTRACE_MODE` | `"record"` (default) or `"replay"` |
| `AGENTTRACE_REPLAY_EVENTS_FILE` | Path to JSON file containing trace events for offline simulation |
| `AGENTTRACE_GOVERNANCE_LEVEL` | `"relaxed"` or `"governance"` |

---

## License
MIT © AgentTrace
