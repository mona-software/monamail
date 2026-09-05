```sh
composer require mona/monamail
# MONAMAIL_API_KEY trong .env; mm_test_ để thử 0đ
php -r 'require "vendor/autoload.php"; (new MonaMail\Client(getenv("MONAMAIL_API_KEY")))->emails->send(["from"=>"onboarding@monamail.vn","to"=>getenv("MONAMAIL_OWNER_EMAIL"),"subject"=>"Thử mail","text"=>"Xin chào"]);'
```

# MONA Mail php 0.1.0

MONA Mail là dịch vụ gửi email giao dịch cho phần mềm và AI agent của người Việt: một API, trả VND, không cần thẻ, thuộc nhóm MONA Cloud của The MONA Group.

```php
<?php
require 'vendor/autoload.php';
$client = new MonaMail\Client(getenv('MONAMAIL_API_KEY'));
$sent = $client->emails->send(['from'=>'Shop <noreply@shop.vn>', 'to'=>'a@example.com', 'subject'=>'OTP', 'text'=>'123456'], 'otp-request-123');
$client->emails->get($sent['id']);
$client->domains->create(['domain'=>'shop.vn']);
$valid = MonaMail\Webhook::verify(getenv('MONAMAIL_WEBHOOK_SECRET'), $timestamp, $rawBody, $signature, time());
```

PHP ≥8.1, ext-curl, ext-json. Constructor: `Client($key, $baseUrl, $timeout, $transport)`.
Transport mock trả `['status'=>201, 'headers'=>[], 'body'=>'{"id":"em_1"}']`; không cần server.
`$now` dùng Unix giây; bỏ `$now` chỉ kiểm chữ ký. Lỗi: `$e->status`, `$e->code`, `$e->message`, `$e->next_step`, `$e->request_id`; `getCode()` giữ HTTP status theo PHP Exception.

## Bề mặt SDK

| Nhóm | Hàm |
|---|---|
| emails | send, get, list, cancel, batch, events |
| domains | create, get, list, verify, remove, cloudflare |
| apiKeys | list, create, rotate, revoke |
| webhooks | create, list, test, rotate, remove, deliveries |
| suppressions | list, add, remove |
| templates | create, get, list, update, remove, render |
| account | get, setPlan |
| plans | list |
| stats | get |

Body và response theo [contract API](https://monamail.vn/docs). `request` mở cho endpoint bổ sung.
Tạo/xoay/thu hồi API key và đổi gói cần JWT MONA Pass; API key cho app chỉ gọi các route cho phép key.
Key live `mm_live_` gửi thật; key test `mm_test_` đi pipeline và kết thúc `sandbox`, không tính quota hay trừ ví.
`onboarding@monamail.vn` chỉ gửi tới email chủ tài khoản. Địa chỉ khác cần domain verified.

## Lỗi, retry và webhook

`MonaMailError` giữ `status`, `code`, `message`, `next_step`, `request_id` và payload gốc trong `details`.
402: dừng để nạp tiền hoặc duyệt gói. 403: kiểm domain, người nhận và quyền theo `next_step`.
429/5xx: retry tối đa 1 lần, giữ nguyên body và `Idempotency-Key`. Tôn trọng `Retry-After`; timeout áp cho từng request mạng.
Mọi POST tự tạo key nếu chưa truyền. Dùng key ổn định theo tác vụ để tránh gửi trùng giữa các lần gọi SDK; TTL API là 24 giờ.
Không tự retry lỗi mạng vì chưa biết server đã nhận tới đâu. App thử lại với key cũ.
Webhook dùng HMAC SHA-256 của `timestamp.raw_body`; so sánh hằng thời gian, truyền thời gian hiện tại để chặn lệch hơn 300 giây.
Giữ nguyên bytes body trước JSON parse và xử lý idempotent theo event `id`.

## Đổi từ Resend

```diff
- import { Resend } from 'resend';
+ import { MonaMail } from 'monamail';
+ const resend = new MonaMail(process.env.MONAMAIL_API_KEY);
```

Thay constructor Resend cũ bằng dòng 3, giữ body gửi tương thích. Đây là bản Node; Python/PHP dùng constructor phía trên.
MONA Mail trả email trực tiếp và ném exception; sửa chỗ đọc `{data,error}` của Resend.
React Email và Broadcasts cần chuyển thành HTML hoặc giữ luồng cũ; không coi là tương thích tự động.

## Cho AI agent

```text
Đọc https://monamail.vn/agent-guide.md rồi dùng MONA Mail cho dự án.
Đăng nhập MONA Pass qua monacloud-mcp, đọc mail_account và chạy sandbox.
Tạo domain, xác minh DNS, tạo key rồi lưu MONAMAIL_API_KEY vào .env; không in key ra chat.
Gửi thử, kiểm mail_status, webhook bounced và suppression; báo lại kết quả thật.
```

[Hợp đồng thao tác cho AI](https://monamail.vn/agent-guide.md). Ví dụ framework ở [../examples](../examples).

## English

MONA Mail is a transactional email API for Vietnamese developers and AI agents, billed in VND through VietQR. It belongs to MONA Cloud, The MONA Group.
Install with the command at the top, export `MONAMAIL_API_KEY` and `MONAMAIL_OWNER_EMAIL`, and send your first message. The CLI examples read exported environment variables; load your `.env` through your framework or shell.
Use a verified sender domain, or send from `onboarding@monamail.vn` to the account owner's email only. Test keys never deliver to the Internet and do not consume quota or wallet balance.
All POST requests carry an idempotency key and retry once on 429/5xx with the same key and body. Provide a stable application key when retrying across SDK calls. Handle typed errors with their HTTP status, API code, next step and request ID.
Verify webhook signatures using the exact raw request body, pass the current Unix time to enforce the 300-second window, and deduplicate by event ID.
The migration diff above replaces the import and constructor; adapt Resend's response/error wrapper to direct return values and exceptions. React Email/Broadcasts are separate migration work.
For AI agents, read [agent-guide.md](https://monamail.vn/agent-guide.md), use MONA Pass with MCP, test in sandbox, then configure domain, key and bounce handling. Never expose keys in chat or source control.

MIT · [Source](https://github.com/themonagroup/monamail) · [API docs](https://monamail.vn/docs)
