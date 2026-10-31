# AgentTrace Examples & Demos

This folder contains runnable sample scripts illustrating how to instrument AI agents using the AgentTrace Python SDK.

## Available Examples

| Script | Purpose | Integrations |
| :--- | :--- | :--- |
| [`01_quickstart.py`](./01_quickstart.py) | Minimal 3-step agent recording & PRNG determinism | Core SDK (`@agenttrace.run`, `agenttrace.step`) |
| [`02_openai_agent.py`](./02_openai_agent.py) | Intercepting & mocking OpenAI completions | OpenAI SDK (`patch_openai`) |
| [`03_langchain_agent.py`](./03_langchain_agent.py) | Attaching to LangChain chains and tools | LangChain (`AgentTraceCallbackHandler`) |

## Quick Run

### 1. Install SDK
```bash
pip install agenttrace-py
```

### 2. Set API Key (Optional for local testing)
```bash
export AGENTTRACE_API_KEY="at_live_your_key_here"
export AGENTTRACE_API_URL="https://www.theagenttrace.com/api"
```

### 3. Run the Quickstart Agent
```bash
python examples/01_quickstart.py
```

### 4. Verify Determinism with CLI
```bash
agenttrace verify examples/01_quickstart.py --runs 2
```
AgentTrace will execute the script in isolated runs and mathematically verify that zero causal drift occurred.
