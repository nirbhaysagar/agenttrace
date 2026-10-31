#!/usr/bin/env python3
"""
AgentTrace Quickstart Example
Demonstrates basic agent instrumentation, step recording, and deterministic replay.
"""

import os
import random
import time
import agenttrace

# 1. Initialize AgentTrace
# In production, pass your API key or set AGENTTRACE_API_KEY environment variable.
agenttrace.init(
    api_key=os.environ.get("AGENTTRACE_API_KEY", "at_live_demo"),
    api_url=os.environ.get("AGENTTRACE_API_URL", "https://www.theagenttrace.com/api")
)

# 2. Decorate your agent entrypoint with @agenttrace.run
@agenttrace.run(name="customer-support-agent")
def run_support_agent(ticket_id: str):
    print(f"\n[Agent] Processing ticket: {ticket_id}")

    # Use agenttrace.step to capture discrete logical steps
    with agenttrace.step("lookup_customer_record"):
        customer_id = "CUST-4821"
        plan_tier = "enterprise"
        print(f"[Step 1] Customer {customer_id} on plan {plan_tier}")

    with agenttrace.step("evaluate_escalation"):
        # PRNG is automatically seeded & deterministic across replays
        urgency_score = random.randint(1, 100)
        should_escalate = urgency_score > 75
        print(f"[Step 2] Urgency score: {urgency_score} (Escalate: {should_escalate})")

    with agenttrace.step("draft_resolution"):
        response = {
            "ticket_id": ticket_id,
            "escalated": should_escalate,
            "status": "in_progress" if should_escalate else "resolved",
            "timestamp": time.time(),
        }
        print(f"[Step 3] Drafted response: {response}")

    return response

if __name__ == "__main__":
    result = run_support_agent("TICK-9082")
    print(f"\n✅ Agent execution finished with result: {result}")
