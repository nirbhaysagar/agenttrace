#!/usr/bin/env python3
"""
AgentTrace LangChain Callback Handler Example
Demonstrates how to plug AgentTrace into LangChain agents and pipelines.
"""

import os
import agenttrace
from agenttrace.integrations.langchain import AgentTraceCallbackHandler

agenttrace.init(
    api_key=os.environ.get("AGENTTRACE_API_KEY", "at_live_demo"),
    api_url=os.environ.get("AGENTTRACE_API_URL", "https://www.theagenttrace.com/api")
)

# Instantiate handler
handler = AgentTraceCallbackHandler()

@agenttrace.run(name="langchain-pipeline")
def run_pipeline():
    print("\n[Agent] Initializing LangChain pipeline with AgentTraceCallbackHandler...")
    
    # Simulate LangChain hook lifecycle events
    handler.on_chain_start({"name": "AgentExecutor"}, {"input": "Analyze quarterly drift"})
    handler.on_llm_start({"name": "ChatOpenAI"}, ["System: You are an analyst.\nUser: Analyze drift."])
    handler.on_tool_start({"name": "calculator"}, "24 * 7")
    handler.on_tool_end("168")
    handler.on_chain_end({"output": "Analysis complete: 168 hours evaluated."})
    
    return {"status": "ok", "events_captured": True}

if __name__ == "__main__":
    res = run_pipeline()
    print(f"✅ Pipeline run result: {res}")
