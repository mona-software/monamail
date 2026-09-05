# MONA Mail SDK 0.1.0 — email API for Vietnamese apps and AI agents (Resend alternative, pay in VND)

MONA Mail là dịch vụ gửi email giao dịch cho phần mềm và AI agent của người Việt: một API, trả VND, không cần thẻ, thuộc nhóm MONA Cloud của The MONA Group.

| Runtime | Package | Source |
|---|---|---|
| Node ≥18, ESM + CommonJS + TypeScript | `monamail` | [node](node/README.md) |
| Python ≥3.8, stdlib | `monamail` | [python](python/README.md) |
| PHP ≥8.1, cURL | `mona/monamail` | [php](php/README.md) |

[Framework examples](examples/README.md): Next.js, Express, Django, Laravel, WordPress, cURL và webhook Express.
Cài: `npm i monamail` · `pip install monamail` · PHP: composer `mona/monamail` (Packagist đang mở). Tài liệu: https://monamail.vn/docs · cho AI: https://monamail.vn/agent-guide.md · MCP: `claude mcp add monacloud -- npx -y monacloud-mcp` (tool `mail_*`). Mã nguồn MIT.

## Offline checks

```sh
cd node && npm test
cd ../python && python -m pytest
cd ../php && php tests/smoke.php
```

Node build tìm tsc cục bộ rồi fallback compiler đã có trong MONA Cloud MCP. Không tải dependency lúc build.
Agent đọc [agent-guide.md](https://monamail.vn/agent-guide.md); ứng dụng dùng biến `MONAMAIL_API_KEY` trong môi trường server.
