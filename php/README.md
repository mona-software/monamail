# mona/monamail

PHP SDK for the MONA Mail transactional email API.

Requires PHP 8.1+ with `ext-curl` and `ext-json`.

## Install

```bash
composer require mona/monamail
```

## Quick start

```php
<?php
require 'vendor/autoload.php';

$client = new MonaMail\Client(getenv('MONAMAIL_API_KEY'));

$sent = $client->emails->send(
    ['from' => 'Shop <noreply@shop.vn>', 'to' => 'a@example.com', 'subject' => 'OTP', 'text' => '123456'],
    'otp-request-123' // idempotency key
);
$client->emails->get($sent['id']);
$client->domains->create(['domain' => 'shop.vn']);
```

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

`$client->request($method, $path, $body, $query, $idempotencyKey)` is available for endpoints not covered above. Request and response bodies follow the [API reference](https://monamail.vn/docs).

### Keys and senders

- `mm_live_` keys deliver mail. `mm_test_` keys run the pipeline and finish with status `sandbox`, without delivering, using quota or charging the wallet.
- Creating, rotating or revoking API keys and changing plans require a MONA Pass JWT; app API keys can only call the routes allowed for keys.
- `onboarding@monamail.vn` can only send to the account owner's address. Other recipients need a verified domain.

### Errors and retries

`MonaMail\MonaMailError` exposes `$e->status`, `$e->code` (API error code), `$e->message`, `$e->next_step`, `$e->request_id` and the raw payload in `$e->details`. `getCode()` returns the HTTP status.

- `402`: top up the wallet or approve a plan.
- `403`: check the domain, recipient or permissions as described in `next_step`.
- `429`/`5xx`: the SDK retries once with the same body and `Idempotency-Key`, honoring `Retry-After`.

Every POST gets an `Idempotency-Key` (generated if you do not pass one). Pass a stable key per task when your app retries; the API keeps keys for 24 hours.

### Webhooks

```php
$valid = MonaMail\Webhook::verify(
    getenv('MONAMAIL_WEBHOOK_SECRET'),
    $timestamp,  // X-Mona-Timestamp header
    $rawBody,    // exact raw request body
    $signature,  // X-Mona-Signature header, "sha256=<hex>"
    time()
);
```

The signature is HMAC-SHA256 of `timestamp.raw_body`. Passing the current Unix time rejects timestamps more than 300 seconds off; omit it to check only the signature. Deduplicate events by `id`.

## Configuration

```php
new MonaMail\Client($apiKey, $baseUrl = 'https://api.monamail.vn', $timeout = 15, $transport = null);
```

`$transport` replaces cURL, which is useful for tests. It receives `($method, $url, $headers, $body, $timeout)` and returns `['status' => 201, 'headers' => [], 'body' => '{"id":"em_1"}']`.

Framework examples: [../examples](../examples/README.md). Website: [monamail.vn](https://monamail.vn).

## Development

```bash
php tests/smoke.php
```

## License

MIT

**MONA Mail is part of MONA Cloud by The MONA Group.**
