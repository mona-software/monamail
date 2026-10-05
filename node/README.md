# monamail

Node.js SDK for the MONA Mail transactional email API.

Runs on Node.js 18+ using the global `fetch`, with no runtime dependencies. Ships ESM, CommonJS and TypeScript types.

## Install

```bash
npm install monamail
```

## Quick start

```ts
import { MonaMail, MonaMailError } from 'monamail';

const client = new MonaMail(process.env.MONAMAIL_API_KEY, { timeoutMs: 15000 });

const sent = await client.emails.send(
  { from: 'Shop <noreply@shop.vn>', to: 'a@example.com', subject: 'OTP', text: '123456' },
  { idempotencyKey: 'otp-request-123' },
);
await client.emails.get(sent.id);
await client.domains.create({ domain: 'shop.vn' });
```

CommonJS: `const { MonaMail } = require('monamail')`.

## Usage

| Resource | Methods |
|---|---|
| `emails` | `send`, `get`, `list`, `cancel`, `batch`, `events` |
| `domains` | `create`, `get`, `list`, `verify`, `remove`, `cloudflare` |
| `apiKeys` | `list`, `create`, `rotate`, `revoke` |
| `webhooks` | `create`, `list`, `test`, `rotate`, `remove`, `deliveries` |
| `suppressions` | `list`, `add`, `remove` |
| `templates` | `create`, `get`, `list`, `update`, `remove`, `render` |
| `account` | `get`, `setPlan` |
| `plans` | `list` |
| `stats` | `get` |

`client.request(method, path, body?, query?, options?)` is available for endpoints not covered above. Request and response bodies follow the [API reference](https://monamail.vn/docs).

### Keys and senders

- `mm_live_` keys deliver mail. `mm_test_` keys run the pipeline and finish with status `sandbox`, without delivering, using quota or charging the wallet.
- Creating, rotating or revoking API keys and changing plans require a MONA Pass JWT; app API keys can only call the routes allowed for keys.
- `onboarding@monamail.vn` can only send to the account owner's address. Other recipients need a verified domain.

### Errors and retries

`MonaMailError` exposes `status`, `code`, `message`, `next_step`, `request_id` and the raw payload in `details`.

- `402`: top up the wallet or approve a plan.
- `403`: check the domain, recipient or permissions as described in `next_step`.
- `429`/`5xx`: the SDK retries once with the same body and `Idempotency-Key`, honoring `Retry-After`.

Every POST gets an `Idempotency-Key` (generated if you do not pass one). Pass a stable key per task when your app retries; the API keeps keys for 24 hours. Network errors are not retried automatically; retry from your app with the same key.

### Webhooks

```ts
const valid = MonaMail.verifyWebhook({
  secret: process.env.MONAMAIL_WEBHOOK_SECRET!,
  timestamp,          // X-Mona-Timestamp header
  body: rawBody,      // exact raw request body
  signature,          // X-Mona-Signature header, "sha256=<hex>"
  now: Date.now() / 1000,
});
```

The signature is HMAC-SHA256 of `timestamp.raw_body`, compared in constant time. Passing `now` (Unix seconds) rejects timestamps more than 300 seconds off; omit it to check only the signature. Keep the raw body bytes before JSON parsing and deduplicate events by `id`.

## Configuration

| Option | Default | Purpose |
|---|---|---|
| `baseUrl` | `https://api.monamail.vn` | API host (a trailing `/v1` is accepted) |
| `timeoutMs` | `15000` | Per-request timeout |
| `fetch` | `globalThis.fetch` | Custom fetch, e.g. for tests |

Framework examples: [../examples](../examples/README.md). Website: [monamail.vn](https://monamail.vn).

## Development

```bash
npm install
npm test
```

## License

MIT

**MONA Mail is part of MONA Cloud by The MONA Group.**
