import express from 'express';
import { MonaMail } from 'monamail';
const app = express();
const secret = process.env.MONAMAIL_WEBHOOK_SECRET;
if (!secret) throw new Error('Cần MONAMAIL_WEBHOOK_SECRET.');
const processed = new Map(); // Demo: production dùng UNIQUE event_id trong DB, cùng transaction xử lý sự kiện.
app.post('/webhooks/monamail', express.raw({type:'application/json',limit:'1mb'}), async (req,res) => {
  if (!Buffer.isBuffer(req.body) || !MonaMail.verifyWebhook({secret,timestamp:req.get('X-Mona-Timestamp') ?? '',signature:req.get('X-Mona-Signature') ?? '',body:req.body,now:Date.now()/1000})) return res.sendStatus(401);
  let event;
  try {event=JSON.parse(req.body.toString('utf8'));} catch {return res.sendStatus(400);}
  if (typeof event.id !== 'string' || typeof event.type !== 'string') return res.sendStatus(400);
  const now=Date.now();
  for (const [id,expires] of processed) if (expires<=now) processed.delete(id);
  if (processed.has(event.id)) return res.sendStatus(204);
  if (processed.size >= 100000) return res.sendStatus(503);
  // Đây là xử lý đồng bộ trong demo. Khi thêm await, dùng DB transaction/unique key để tránh chạy trùng.
  if (event.type==='email.bounced') console.info('MONA Mail bounce', {event_id:event.id,email_id:event.data?.email_id});
  processed.set(event.id,now+48*60*60*1000);
  return res.sendStatus(204);
});
// Đặt express.json sau route raw để giữ đúng bytes dùng ký HMAC.
app.use(express.json());
app.listen(Number(process.env.PORT ?? 3001));
