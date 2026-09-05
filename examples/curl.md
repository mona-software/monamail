# 8 lệnh cURL

Export `MONAMAIL_API_KEY` và `MONAMAIL_OWNER_EMAIL` trong môi trường server; các ID bên dưới lấy từ response trước.
Các key `demo-*` chỉ dành cho lần chạy demo đầu. Đổi key cho tác vụ mới, giữ nguyên khi retry cùng body trong 24 giờ.

```sh
# 1. Tài khoản
curl -sS https://api.monamail.vn/v1/account -H "Authorization: Bearer $MONAMAIL_API_KEY"
# 2. Giá public
curl -sS https://api.monamail.vn/v1/plans
# 3. Domain
curl -sS https://api.monamail.vn/v1/domains -H "Authorization: Bearer $MONAMAIL_API_KEY" -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-domain-1' -d '{"domain":"shop.vn"}'
# 4. Xác minh sau khi thêm DNS response records[]
curl -sS -X POST "https://api.monamail.vn/v1/domains/$DOMAIN_ID/verify" -H "Authorization: Bearer $MONAMAIL_API_KEY" -H 'Idempotency-Key: demo-verify-1'
# 5. Gửi tới email chủ, MONAMAIL_OWNER_EMAIL là địa chỉ email thông thường
curl -sS https://api.monamail.vn/v1/emails -H "Authorization: Bearer $MONAMAIL_API_KEY" -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-email-1' -d "{\"from\":\"onboarding@monamail.vn\",\"to\":\"$MONAMAIL_OWNER_EMAIL\",\"subject\":\"Thử mail\",\"text\":\"Xin chào\"}"
# 6. Trạng thái
curl -sS "https://api.monamail.vn/v1/emails/$EMAIL_ID" -H "Authorization: Bearer $MONAMAIL_API_KEY"
# 7. Webhook
curl -sS https://api.monamail.vn/v1/webhooks -H "Authorization: Bearer $MONAMAIL_API_KEY" -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-webhook-1' -d '{"url":"https://shop.vn/webhooks/monamail","events":["email.bounced","email.delivered"]}'
# 8. Suppression
curl -sS https://api.monamail.vn/v1/suppressions -H "Authorization: Bearer $MONAMAIL_API_KEY"
```

Không lưu response chứa secret webhook trong log công khai. Dùng `mm_test_` để thử pipeline không gửi ra Internet.
