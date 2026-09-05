import express from 'express';
import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { MonaMail, MonaMailError } from 'monamail';
const app = express();
app.use(express.json({ limit: '4kb' }));
const client = new MonaMail(process.env.MONAMAIL_API_KEY);
const otpSecret = process.env.OTP_HASH_SECRET;
if (!otpSecret) throw new Error('Cần OTP_HASH_SECRET riêng trong môi trường server.');
const records = new Map(); // Demo 1 process; production dùng Redis và rate limit tại reverse proxy.
const digest = (email, otp) => createHmac('sha256', otpSecret).update(`${email}:${otp}`).digest();
app.post('/otp', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Email chưa hợp lệ.' });
  const now = Date.now();
  for (const [key,value] of records) if (value.expiresAt <= now) records.delete(key);
  if (records.get(email)?.retryAt > now) return res.set('Retry-After','60').status(429).json({ error: 'Chờ 60 giây rồi thử lại.' });
  if (records.size >= 10000) return res.status(429).json({ error: 'Tạm hết lượt gửi.' });
  const otp = String(randomInt(100000,1000000));
  records.set(email,{digest:digest(email,otp),expiresAt:now+300000,retryAt:now+60000,attempts:0});
  try {
    const sent = await client.emails.send({from:process.env.MONAMAIL_FROM ?? 'onboarding@monamail.vn',to:email,subject:'Mã OTP',text:`Mã OTP của anh chị: ${otp}. Hết hạn sau 5 phút.`,tags:['otp']},{idempotencyKey:`otp-${randomUUID()}`});
    return res.status(202).json({id:sent.id,status:sent.status});
  } catch(error) { return res.status(503).json({error:'Chưa gửi được OTP.',request_id:error instanceof MonaMailError ? error.request_id : undefined}); }
});
app.post('/otp/verify', (req,res) => {
  const email=String(req.body?.email ?? '').trim().toLowerCase();
  const entry=records.get(email);
  if (!entry || entry.expiresAt <= Date.now() || entry.attempts >= 5) return res.status(400).json({verified:false});
  entry.attempts++;
  const valid=timingSafeEqual(entry.digest,digest(email,String(req.body?.otp ?? '')));
  if (valid) records.delete(email);
  // Nối xác minh này vào luồng tạo session của app; không cấp session trong demo.
  return res.status(valid ? 200 : 400).json({verified:valid});
});
app.listen(Number(process.env.PORT ?? 3000));
