"""
AgentTrace Framework Integrations

Provides drop-in handlers and hooks for LangChain, OpenAI, and CrewAI.
"""

from typing import Any

def get_langchain_callback() -> Any:
    """Helper to return an initialized AgentTraceCallbackHandler."""
    from .langchain import AgentTraceCallbackHandler
    return AgentTraceCallbackHandler()

def patch_openai(client: Any = None) -> Any:
    """Helper to instrument OpenAI client with deterministic flight recording."""
    from .openai import patch_openai as _patch
    return _patch(client)

__all__ = ["get_langchain_callback", "patch_openai"]
