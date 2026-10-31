#!/usr/bin/env python3
"""
AgentTrace OpenAI SDK Integration Example
Demonstrates how AgentTrace deterministically captures and mocks OpenAI API calls.
"""

import os
import agenttrace
from agenttrace.integrations.openai import patch_openai

# Initialize AgentTrace
agenttrace.init(
    api_key=os.environ.get("AGENTTRACE_API_KEY", "at_live_demo"),
    api_url=os.environ.get("AGENTTRACE_API_URL", "https://www.theagenttrace.com/api")
)

# Patch the OpenAI client for deterministic replay capture
client = patch_openai()

@agenttrace.run(name="openai-summarizer")
def run_summarizer(text: str):
    print(f"\n[Agent] Summarizing text: {text[:50]}...")

    with agenttrace.step("call_llm"):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a concise research analyst."},
                {"role": "user", "content": f"Summarize this: {text}"}
            ],
            temperature=0.0
        )
        summary = response.choices[0].message.content
        print(f"[LLM Response] {summary}")

    return {"summary": summary}

if __name__ == "__main__":
    sample_text = (
        "AgentTrace provides deterministic execution environments for autonomous AI agents. "
        "It eliminates causal drift by intercepting inputs, locking PRNG seeds, and anchoring system time."
    )
    res = run_summarizer(sample_text)
    print(f"✅ Summary complete: {res}")
