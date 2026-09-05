import { createHash, randomInt, randomUUID } from 'node:crypto';
import { MonaMail, MonaMailError } from 'monamail';
export const runtime = 'nodejs';
// Demo 1 process: production dùng Redis với TTL và endpoint xác minh OTP, giới hạn số lần nhập.
const records = new Map<string, { retryAt: number; expiresAt: number; digest: string; nonce: string }>();
export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: 'JSON chưa hợp lệ.' }, { status: 400 }); }
  const email = typeof (input as { email?: unknown })?.email === 'string' ? (input as { email: string }).email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: 'Email chưa hợp lệ.' }, { status: 400 });
  const now = Date.now();
  for (const [key, value] of records) if (value.expiresAt <= now) records.delete(key);
  if (records.has(email) && records.get(email)!.retryAt > now) return Response.json({ error: 'Chờ 60 giây rồi thử lại.' }, { status: 429, headers: { 'Retry-After': '60' } });
  if (records.size >= 10000) return Response.json({ error: 'Tạm hết lượt gửi.' }, { status: 429 });
  const otp = String(randomInt(100000, 1000000));
  const nonce = randomUUID();
  records.set(email, { retryAt: now + 60000, expiresAt: now + 300000, nonce, digest: createHash('sha256').update(`${nonce}:${otp}`).digest('hex') });
  try {
    const client = new MonaMail(process.env.MONAMAIL_API_KEY);
    const mail = await client.emails.send({ from: process.env.MONAMAIL_FROM ?? 'onboarding@monamail.vn', to: email, subject: 'Mã OTP', text: `Mã OTP của anh chị: ${otp}. Hết hạn sau 5 phút.`, tags: ['otp'] }, { idempotencyKey: `otp-${nonce}` });
    return Response.json({ id: mail.id, status: mail.status }, { status: 202 });
  } catch (error) {
    return Response.json({ error: 'Chưa gửi được OTP.', request_id: error instanceof MonaMailError ? error.request_id : undefined }, { status: 503 });
  }
}
