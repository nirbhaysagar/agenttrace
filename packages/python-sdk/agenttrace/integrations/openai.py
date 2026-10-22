"""
OpenAI SDK Auto-Instrumentation for AgentTrace.
"""

from functools import wraps
from typing import Any, Optional
import agenttrace

def patch_openai(client: Optional[Any] = None) -> Any:
    """
    Instrument an OpenAI client (or global openai module) so all completions
    and chat completions automatically create structured AgentTrace steps.
    
    Usage:
        import openai
        from agenttrace.integrations.openai import patch_openai

        client = openai.OpenAI()
        patch_openai(client)
    """
    if client is None:
        try:
            import openai
            client = openai
        except ImportError:
            raise ImportError("The 'openai' package is required to use patch_openai(). Run: pip install openai")

    # Patch chat.completions.create
    target = getattr(client, "chat", None)
    if target and hasattr(target, "completions"):
        original_create = target.completions.create

        @wraps(original_create)
        def traced_chat_create(*args: Any, **kwargs: Any) -> Any:
            model = kwargs.get("model", "unknown-model")
            messages = kwargs.get("messages", [])

            # Filter or preview messages
            summary_input = {
                "model": model,
                "message_count": len(messages),
                "temperature": kwargs.get("temperature"),
                "max_tokens": kwargs.get("max_tokens"),
            }
            if messages:
                # Include last user message preview if available
                last_msg = messages[-1] if isinstance(messages[-1], dict) else getattr(messages[-1], "__dict__", str(messages[-1]))
                summary_input["last_message"] = last_msg

            with agenttrace.step(f"OpenAI: {model}", type="llm_call", input=summary_input):
                response = original_create(*args, **kwargs)
                result_payload = {}
                if hasattr(response, "choices") and response.choices:
                    first_choice = response.choices[0]
                    msg = getattr(first_choice, "message", None)
                    if msg:
                        result_payload["content"] = getattr(msg, "content", "")
                        result_payload["role"] = getattr(msg, "role", "assistant")

                if hasattr(response, "usage") and response.usage:
                    result_payload["usage"] = {
                        "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                        "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                        "total_tokens": getattr(response.usage, "total_tokens", 0),
                    }
                result_payload["model"] = getattr(response, "model", model)

                agenttrace.set_result(result_payload)
                return response

        target.completions.create = traced_chat_create

    return client
