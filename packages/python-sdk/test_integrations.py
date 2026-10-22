"""
Unit tests for AgentTrace Framework Integrations (LangChain, OpenAI).
"""

import agenttrace
from agenttrace.integrations.langchain import AgentTraceCallbackHandler
from agenttrace.integrations.openai import patch_openai

captured_traces = []

class MockClient:
    @staticmethod
    def send_trace(trace_data):
        captured_traces.append(trace_data)

agenttrace.client.AgentTraceClient.send_trace = MockClient.send_trace

def test_langchain_callback():
    print("Testing LangChain Callback Handler...")
    agenttrace.init(api_key="at_test_langchain", mode="record")
    handler = AgentTraceCallbackHandler()

    @agenttrace.run(name="test_langchain_run")
    def agent_flow():
        import uuid
        run_id = uuid.uuid4()
        # Simulate LLM Start & End
        handler.on_llm_start({"name": "gpt-4o"}, ["What is determinism?"], run_id=run_id)
        
        class MockResponse:
            llm_output = {"token_usage": {"total_tokens": 42}, "model_name": "gpt-4o"}
            generations = [[type("Gen", (), {"text": "Determinism means predictable output."})()]]
        
        handler.on_llm_end(MockResponse(), run_id=run_id)

        # Simulate Tool Start & End
        tool_run_id = uuid.uuid4()
        handler.on_tool_start({"name": "calculator"}, "2 + 2", run_id=tool_run_id)
        handler.on_tool_end("4", run_id=tool_run_id)
        return "done"

    res = agent_flow()
    assert res == "done"
    assert len(captured_traces) >= 1
    events = captured_traces[-1]["events"]
    event_types = [e["type"] for e in events]
    print(f"Captured event types: {event_types}")
    assert "llm_call" in event_types
    assert "tool_call" in event_types
    print("✅ LangChain integration verified successfully.")

def test_openai_patching():
    print("\nTesting OpenAI Patching...")
    # Create a mock OpenAI client
    class MockCompletions:
        def create(self, **kwargs):
            class Choice:
                message = type("Msg", (), {"content": "Hello human!", "role": "assistant"})()
            class Usage:
                prompt_tokens = 10
                completion_tokens = 5
                total_tokens = 15
            class Response:
                choices = [Choice()]
                usage = Usage()
                model = kwargs.get("model", "mock-model")
            return Response()

    class MockChat:
        completions = MockCompletions()

    class MockOpenAIClient:
        chat = MockChat()

    client = MockOpenAIClient()
    patch_openai(client)

    @agenttrace.run(name="test_openai_run")
    def openai_agent():
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hi"}]
        )
        return resp.choices[0].message.content

    res = openai_agent()
    assert res == "Hello human!"
    events = captured_traces[-1]["events"]
    event_types = [e["type"] for e in events]
    print(f"Captured event types: {event_types}")
    assert "llm_call" in event_types
    print("✅ OpenAI integration verified successfully.")

if __name__ == "__main__":
    test_langchain_callback()
    test_openai_patching()
    print("\n🎉 ALL INTEGRATION TESTS PASSED.")
