# MONA Mail SDKs

Official Node.js, Python and PHP clients for the MONA Mail transactional email API, plus framework examples.

MONA Mail accounts are billed in VND through the MONA Cloud wallet.

| Runtime | Package | Source |
|---|---|---|
| Node.js 18+, ESM + CommonJS + TypeScript | [`monamail`](https://www.npmjs.com/package/monamail) | [node/](node/README.md) |
| Python 3.8+, standard library only | [`monamail`](https://pypi.org/project/monamail/) | [python/](python/README.md) |
| PHP 8.1+, ext-curl | `mona/monamail` | [php/](php/README.md) |

## Install

```bash
npm install monamail
pip install monamail
composer require mona/monamail
```

## Quick start

```js
import { MonaMail } from 'monamail';

const client = new MonaMail(process.env.MONAMAIL_API_KEY);
await client.emails.send({
  from: 'onboarding@monamail.vn',
  to: process.env.MONAMAIL_OWNER_EMAIL,
  subject: 'Test email',
  text: 'Hello',
});
```

`onboarding@monamail.vn` can only send to the account owner's address; use a verified domain for anything else. Keys starting with `mm_test_` run the full pipeline but end in the `sandbox` status without delivering.

## Usage

All three SDKs expose the same resources: `emails`, `domains`, `apiKeys`/`api_keys`, `webhooks`, `suppressions`, `templates`, `account`, `plans` and `stats`, plus a webhook signature helper. See each package README for details.

[Framework examples](examples/README.md): Next.js App Router, Express (OTP and webhook), Django, Laravel, WordPress and cURL.

AI agents can manage MONA Mail through the `mail_*` tools in [monacloud-mcp](https://github.com/mona-software/monacloud-mcp):

```bash
claude mcp add monacloud -- npx -y monacloud-mcp
```

## Configuration

Applications read the API key from `MONAMAIL_API_KEY` on the server. The API base URL defaults to `https://api.monamail.vn`.

Documentation: [monamail.vn/docs](https://monamail.vn/docs) · Website: [monamail.vn](https://monamail.vn)

## Development

Tests make no network calls. The Node build needs a local TypeScript compiler (`npm install` in `node/`).

```sh
cd node && npm install && npm test
cd ../python && python -m pytest
cd ../php && php tests/smoke.php
```

## License

MIT

**MONA Mail is part of MONA Cloud by The MONA Group.**
