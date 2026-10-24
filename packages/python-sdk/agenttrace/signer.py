import hmac
import hashlib
import json

def sign_trace(events: list, key: str) -> str:
    """HMAC-SHA256 over canonical JSON (events sorted by seq, keys sorted). Returns hex digest."""
    sorted_events = sorted(events, key=lambda e: e.get("seq", 0))
    canonical_json = json.dumps(sorted_events, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(
        key.encode("utf-8"),
        canonical_json.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return signature

def verify_trace(events: list, key: str, signature: str) -> bool:
    """Constant-time comparison. Raises ValueError if invalid."""
    expected = sign_trace(events, key)
    if not hmac.compare_digest(expected, signature):
        raise ValueError("Trace signature validation failed: The trace has been tampered with or the signature is invalid.")
    return True
