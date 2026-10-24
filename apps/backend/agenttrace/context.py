import uuid
import threading
from contextvars import ContextVar
from typing import Optional, Dict, Any, List

# Thread-safe global variables for async/sync mixed execution
_trace_ctx: ContextVar[Optional[Dict[str, Any]]] = ContextVar("agenttrace_trace_ctx", default=None)
_step_ctx: ContextVar[Optional[Dict[str, Any]]] = ContextVar("agenttrace_step_ctx", default=None)
_capturing: ContextVar[bool] = ContextVar("agenttrace_capturing", default=False)

def _get_or_create_trace() -> Dict[str, Any]:
    """Get the active trace context or create it safely."""
    ctx = _trace_ctx.get()
    if ctx is None:
        raise RuntimeError("AgentTrace is not active. Did you forget the @agenttrace.run decorator?")
    return ctx

def _get_active_step() -> Optional[Dict[str, Any]]:
    return _step_ctx.get()

def _get_step_name() -> str:
    """Returns the name of the current step or 'root' if no step is active."""
    step = _get_active_step()
    if step:
        return step.get("name", "unknown_step")
    return "root"

def _push_event(event: Dict[str, Any]):
    if _capturing.get():
        return

    trace = _get_or_create_trace()
    lock = trace.get("lock")
    if lock:
        with lock:
            if "step" not in event:
                event["step"] = _get_step_name()
            event["seq"] = trace["event_count"]
            trace["events"].append(event)
            trace["event_count"] += 1
    else:
        if "step" not in event:
            event["step"] = _get_step_name()
        event["seq"] = trace["event_count"]
        trace["events"].append(event)
        trace["event_count"] += 1
