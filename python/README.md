# monamail

Python SDK for the MONA Mail transactional email API.

Runs on Python 3.8+ using only the standard library.

## Install

```bash
pip install monamail
```

## Quick start

```python
import os
from monamail import MonaMail, MonaMailError

client = MonaMail(os.environ["MONAMAIL_API_KEY"], timeout=15)

sent = client.emails.send(
    {"from": "Shop <noreply@shop.vn>", "to": "a@example.com", "subject": "OTP", "text": "123456"},
    idempotency_key="otp-request-123",
)
client.emails.get(sent["id"])
client.domains.create(domain="shop.vn")
```

`from` is a Python keyword, so pass the email as a dict to `emails.send({...})`. Other methods take keyword arguments, for example `templates.create(name="otp", subject="OTP", html="<b>OTP</b>")`.

## Usage

| Resource | Methods |
|---|---|
| `emails` | `send`, `get`, `list`, `cancel`, `batch`, `events` |
| `domains` | `create`, `get`, `list`, `verify`, `remove`, `cloudflare` |
| `api_keys` | `list`, `create`, `rotate`, `revoke` |
| `webhooks` | `create`, `list`, `test`, `rotate`, `remove`, `deliveries` |
| `suppressions` | `list`, `add`, `remove` |
| `templates` | `create`, `get`, `list`, `update`, `remove`, `render` |
| `account` | `get`, `set_plan` |
| `plans` | `list` |
| `stats` | `get` |

`client.request(method, path, body=None, query=None, idempotency_key=None)` is available for endpoints not covered above. Request and response bodies follow the [API reference](https://monamail.vn/docs).

### Keys and senders

- `mm_live_` keys deliver mail. `mm_test_` keys run the pipeline and finish with status `sandbox`, without delivering, using quota or charging the wallet.
- Creating, rotating or revoking API keys and changing plans require a MONA Pass JWT; app API keys can only call the routes allowed for keys.
- `onboarding@monamail.vn` can only send to the account owner's address. Other recipients need a verified domain.

### Errors and retries

`MonaMailError` exposes `status`, `code`, `message`, `next_step`, `request_id` and the raw payload in `details`.

- `402`: top up the wallet or approve a plan.
- `403`: check the domain, recipient or permissions as described in `next_step`.
- `429`/`5xx`: the SDK retries once with the same body and `Idempotency-Key`, honoring `Retry-After`.

Every POST gets an `Idempotency-Key` (generated if you do not pass one). Pass a stable key per task when your app retries; the API keeps keys for 24 hours. Network errors are not retried automatically.

### Webhooks

```python
import time
from monamail import verify_webhook

valid = verify_webhook(
    os.environ["MONAMAIL_WEBHOOK_SECRET"],
    timestamp,   # X-Mona-Timestamp header
    raw_body,    # exact raw request body
    signature,   # X-Mona-Signature header, "sha256=<hex>"
    now=time.time(),
)
```

The signature is HMAC-SHA256 of `timestamp.raw_body`, compared in constant time. Passing `now` (Unix seconds) rejects timestamps more than 300 seconds off; omit it to check only the signature. Deduplicate events by `id`.

## Configuration

```python
MonaMail(api_key, base_url="https://api.monamail.vn", timeout=15)
```

`base_url` accepts the host with or without a trailing `/v1`; `timeout` is per request, in seconds.

Framework examples: [../examples](../examples/README.md). Website: [monamail.vn](https://monamail.vn).

## Development

```bash
python -m pytest
```

## License

MIT

**MONA Mail is part of MONA Cloud by The MONA Group.**
