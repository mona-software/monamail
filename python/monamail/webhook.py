import hashlib
import hmac
import math
import re


def verify_webhook(secret, timestamp, body, signature, now=None):
    """Verify exact raw bytes. Optional now is Unix seconds; tolerance is 300s."""
    if not secret or not re.fullmatch(r'[0-9]+', str(timestamp)):
        return False
    if not isinstance(signature, str) or not re.fullmatch(r'sha256=[a-fA-F0-9]{64}', signature):
        return False
    if now is not None and (not math.isfinite(now) or abs(now - int(timestamp)) > 300):
        return False
    key = secret.encode('utf-8') if isinstance(secret, str) else secret
    raw = body.encode('utf-8') if isinstance(body, str) else body
    expected = hmac.new(key, str(timestamp).encode('ascii') + b'.' + raw, hashlib.sha256).digest()
    return hmac.compare_digest(expected, bytes.fromhex(signature[7:]))
