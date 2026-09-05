# Framework examples

| Ví dụ | Đặt vào dự án |
|---|---|
| Next.js App Router | `nextjs-app-router/app/api/otp/route.ts` |
| Express gửi và xác minh OTP | `express/otp.mjs` |
| Django | `django/views.py`, gắn view `send_otp` vào URL của app |
| Laravel | `laravel/app/Mail/MonaMailOtp.php` và `laravel/routes/api.php` |
| WordPress | `wordpress/mu-plugins/monamail-wp-mail.php` |
| Express webhook | `webhook-express.mjs` |
| cURL | [8 lệnh](curl.md) |

Cài SDK từ thư mục tương ứng hoặc package registry khi đã publish. Framework dependency thuộc app sử dụng ví dụ.
Export `MONAMAIL_API_KEY`, `MONAMAIL_FROM`, `MONAMAIL_OWNER_EMAIL`; webhook cần `MONAMAIL_WEBHOOK_SECRET`.
Express OTP cần thêm `OTP_HASH_SECRET` là bí mật ngẫu nhiên riêng. Next.js cần secret store/session verify riêng khi ghép vào app.
Laravel thêm `services.monamail.key = env('MONAMAIL_API_KEY')`, `services.monamail.from = env('MONAMAIL_FROM', 'onboarding@monamail.vn')` trong `config/services.php` để chạy được với config cache.

POST JSON `{"email":"owner@example.com"}` vào `/otp` hoặc `/api/otp` theo framework. Bắt đầu với key `mm_test_`.
`onboarding@monamail.vn` chỉ tới email chủ tài khoản. Dùng sender thuộc domain verified khi gửi cho khách.
Các ví dụ không trả OTP hay key trong response. Rate limit demo là 1 OTP/60 giây/địa chỉ; Express có endpoint verify, 5 lượt nhập và hết hạn 5 phút.
Next.js, Django và Laravel là ví dụ gửi; nối store OTP vào endpoint xác minh của app, xoá khi dùng xong và giới hạn số lượt nhập.
Production dùng Redis/DB cho TTL, rate limit nguyên tử theo tài khoản/IP và chống bot; map trong process không chia sẻ giữa worker và mất khi restart.
Webhook demo chống trùng trong 48 giờ; production dùng event_id UNIQUE cùng transaction nghiệp vụ, chỉ trả 2xx sau khi ghi bền vững.
WordPress giữ kết quả filter trước, nhận text/HTML, cc/bcc/reply-to và file đính kèm. API nhận queued nghĩa là đã tiếp nhận, chưa có nghĩa delivered.

Không dùng email thật trong test tự động. Không commit `.env`; chỉ copy [AGENTS.md](AGENTS.md) vào repository cần tích hợp.
