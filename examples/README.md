# MONA Mail framework examples

Copy-ready examples that send an OTP or handle webhooks with the MONA Mail SDKs.

| Example | File to add to your project |
|---|---|
| Next.js App Router | `nextjs-app-router/app/api/otp/route.ts` |
| Express: send and verify OTP | `express/otp.mjs` |
| Django | `django/views.py` (route the `send_otp` view in your app) |
| Laravel | `laravel/app/Mail/MonaMailOtp.php` and `laravel/routes/api.php` |
| WordPress | `wordpress/mu-plugins/monamail-wp-mail.php` |
| Express webhook | `webhook-express.mjs` |
| cURL | [curl.md](curl.md) |

## Install

Install the SDK for your runtime (`npm install monamail`, `pip install monamail` or `composer require mona/monamail`). Framework dependencies belong to the app that uses the example.

## Configuration

| Variable | Used by |
|---|---|
| `MONAMAIL_API_KEY` | All examples |
| `MONAMAIL_FROM` | Sender address |
| `MONAMAIL_OWNER_EMAIL` | Recipient for tests with `onboarding@monamail.vn` |
| `MONAMAIL_WEBHOOK_SECRET` | Webhook example |
| `OTP_HASH_SECRET` | Express OTP example (a separate random secret) |

For Laravel, add these to `config/services.php` so the example works with config caching:

```php
'monamail' => [
    'key' => env('MONAMAIL_API_KEY'),
    'from' => env('MONAMAIL_FROM', 'onboarding@monamail.vn'),
],
```

## Usage

POST `{"email":"owner@example.com"}` to `/otp` or `/api/otp`, depending on the framework. Start with an `mm_test_` key.

- `onboarding@monamail.vn` only delivers to the account owner. Use a sender on a verified domain for customers.
- The examples never return the OTP or the key in a response. The demo rate limit is one OTP per address per 60 seconds; the Express example also has a verify endpoint with five attempts and a five-minute expiry.
- Next.js, Django and Laravel only send. Connect your own OTP store and verify endpoint, delete codes after use and limit attempts.
- In production, use Redis or a database for TTLs, atomic rate limits per account or IP, and bot protection. In-process maps are not shared between workers and are lost on restart.
- The webhook demo deduplicates for 48 hours. In production, store `event_id` with a UNIQUE constraint in the same transaction as your business logic and return 2xx only after the write is durable.
- The WordPress plugin keeps earlier filter results and supports text/HTML, cc/bcc, reply-to and attachments.
- An API response of `queued` means the email was accepted, not yet delivered.

Do not use real addresses in automated tests and do not commit `.env`. Copy [AGENTS.md](AGENTS.md) into a repository to give coding agents the integration rules.

**MONA Mail is part of MONA Cloud by The MONA Group.**
