"""
LangChain & LangGraph Integration for AgentTrace.
"""

from typing import Any, Dict, List, Optional
import uuid
import agenttrace

try:
    from langchain_core.callbacks.base import BaseCallbackHandler
except ImportError:
    try:
        from langchain.callbacks.base import BaseCallbackHandler
    except ImportError:
        # Graceful fallback if langchain is not installed
        class BaseCallbackHandler:  # type: ignore
            pass

class AgentTraceCallbackHandler(BaseCallbackHandler):
    """
    LangChain Callback Handler that records LLM generations, tool executions,
    and agent actions directly into AgentTrace execution graphs.
    """

    def __init__(self):
        super().__init__()
        self._active_steps: Dict[str, Any] = {}

    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], *, run_id: uuid.UUID, **kwargs: Any
    ) -> Any:
        model_name = serialized.get("name") or serialized.get("id", ["unknown"])[-1]
        step_instance = agenttrace.step(
            name=f"LLM: {model_name}",
            type="llm_call",
            model=model_name,
            prompts=prompts
        )
        step_instance.__enter__()
        self._active_steps[str(run_id)] = step_instance

    def on_llm_end(self, response: Any, *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            llm_output = getattr(response, "llm_output", {}) or {}
            token_usage = llm_output.get("token_usage", {})
            generations = getattr(response, "generations", [])
            output_texts = []
            for gen_list in generations:
                for gen in gen_list:
                    output_texts.append(getattr(gen, "text", str(gen)))

            agenttrace.set_result({
                "outputs": output_texts,
                "token_usage": token_usage,
                "model_name": llm_output.get("model_name")
            })
            step_instance.__exit__(None, None, None)

    def on_llm_error(self, error: BaseException, *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            step_instance.__exit__(type(error), error, None)

    def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, *, run_id: uuid.UUID, **kwargs: Any
    ) -> Any:
        tool_name = serialized.get("name", "Tool")
        step_instance = agenttrace.step(
            name=f"Tool: {tool_name}",
            type="tool_call",
            tool=tool_name,
            input=input_str
        )
        step_instance.__enter__()
        self._active_steps[str(run_id)] = step_instance

    def on_tool_end(self, output: str, *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            agenttrace.set_result({"output": str(output)})
            step_instance.__exit__(None, None, None)

    def on_tool_error(self, error: BaseException, *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            step_instance.__exit__(type(error), error, None)

    def on_chain_start(
        self, serialized: Dict[str, Any], inputs: Dict[str, Any], *, run_id: uuid.UUID, **kwargs: Any
    ) -> Any:
        chain_name = serialized.get("name") or serialized.get("id", ["Chain"])[-1]
        step_instance = agenttrace.step(
            name=f"Chain: {chain_name}",
            type="thought",
            inputs=inputs
        )
        step_instance.__enter__()
        self._active_steps[str(run_id)] = step_instance

    def on_chain_end(self, outputs: Dict[str, Any], *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            agenttrace.set_result({"outputs": outputs})
            step_instance.__exit__(None, None, None)

    def on_chain_error(self, error: BaseException, *, run_id: uuid.UUID, **kwargs: Any) -> Any:
        step_instance = self._active_steps.pop(str(run_id), None)
        if step_instance:
            step_instance.__exit__(type(error), error, None)
