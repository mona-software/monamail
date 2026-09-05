import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { MonaMail, MonaMailError } from '../dist/index.js';
const payload = { from: 'Shop <noreply@shop.vn>', to: ['a@example.com'], subject: 'Mã OTP', html: '<b>123456</b>' };
const reply = (status, data, headers = {}) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers });

test('send preserves body and auth; explicit idempotency key survives retry', async () => {
  const calls = [];
  const client = new MonaMail('mm_test_example', { fetch: async (url, init) => { calls.push({ url, ...init }); return calls.length === 1 ? reply(429, { code: 'rate_limited' }, { 'Retry-After': '0' }) : reply(201, { id: 'em_1', status: 'queued' }); } });
  assert.equal((await client.emails.send(payload, { idempotencyKey: 'otp-1' })).id, 'em_1');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.url, 'https://api.monamail.vn/v1/emails');
    assert.equal(call.method, 'POST'); assert.equal(call.headers.Authorization, 'Bearer mm_test_example');
    assert.equal(call.headers['Idempotency-Key'], 'otp-1'); assert.equal(call.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(call.body), payload);
  }
});
for (const [status, code] of [[402, 'quota_exceeded'], [403, 'domain_not_verified']]) {
  test(`maps ${status} without retry`, async () => {
    let calls = 0;
    const client = new MonaMail('key', { fetch: async () => { calls++; return reply(status, { code, message: 'Không gửi được.', next_step: 'Kiểm tra tài khoản.', request_id: 'req_1' }); } });
    await assert.rejects(client.emails.send(payload), e => e instanceof MonaMailError && e.status === status && e.code === code && e.next_step === 'Kiểm tra tài khoản.' && e.request_id === 'req_1');
    assert.equal(calls, 1);
  });
}
test('all resources route and encode ids; every POST generates a stable key', async () => {
  const calls = [];
  const client = new MonaMail('key', { baseUrl: 'https://example.test/v1/', fetch: async (url, init) => { calls.push({ url: new URL(url), ...init }); return reply(200, {}); } });
  const cases = [
    ['GET','/account',()=>client.account.get()], ['GET','/plans',()=>client.plans.list()], ['GET','/stats',()=>client.stats.get({from:'2026-09-01'})],
    ['PUT','/account/plan',()=>client.account.setPlan('free')], ['POST','/emails',()=>client.emails.send(payload)],
    ['GET','/emails/a%2Fb',()=>client.emails.get('a/b')], ['GET','/emails',()=>client.emails.list({limit:20,to:'a+b@example.com'})],
    ['POST','/emails/e/cancel',()=>client.emails.cancel('e')], ['POST','/emails/batch',()=>client.emails.batch([payload])],
    ['GET','/emails/e/events',()=>client.emails.events('e')], ['POST','/domains',()=>client.domains.create({domain:'shop.vn'})],
    ['GET','/domains/d',()=>client.domains.get('d')], ['GET','/domains',()=>client.domains.list()], ['POST','/domains/d/verify',()=>client.domains.verify('d')],
    ['DELETE','/domains/d',()=>client.domains.remove('d')], ['POST','/domains/d/cloudflare',()=>client.domains.cloudflare('d',{api_token:'cf'})],
    ['GET','/api-keys',()=>client.apiKeys.list()], ['POST','/api-keys',()=>client.apiKeys.create({name:'test',mode:'test'})],
    ['POST','/api-keys/k/rotate',()=>client.apiKeys.rotate('k')], ['DELETE','/api-keys/k',()=>client.apiKeys.revoke('k')],
    ['POST','/webhooks',()=>client.webhooks.create({url:'https://shop.vn/webhook',events:['email.bounced']})], ['GET','/webhooks',()=>client.webhooks.list()],
    ['POST','/webhooks/w/test',()=>client.webhooks.test('w')], ['POST','/webhooks/w/rotate',()=>client.webhooks.rotate('w')],
    ['DELETE','/webhooks/w',()=>client.webhooks.remove('w')], ['GET','/webhooks/w/deliveries',()=>client.webhooks.deliveries('w',{limit:10})],
    ['GET','/suppressions',()=>client.suppressions.list()], ['POST','/suppressions',()=>client.suppressions.add({email:'a@example.com'})],
    ['DELETE','/suppressions/a%2Bb%40example.com',()=>client.suppressions.remove('a+b@example.com')],
    ['POST','/templates',()=>client.templates.create({name:'otp',subject:'OTP',html:'OTP'})], ['GET','/templates/t',()=>client.templates.get('t')],
    ['GET','/templates',()=>client.templates.list()], ['PUT','/templates/t',()=>client.templates.update('t',{subject:'New'})],
    ['DELETE','/templates/t',()=>client.templates.remove('t')], ['POST','/templates/t/render',()=>client.templates.render('t',{variables:{name:'An'}})],
  ];
  for (const [method,path,call] of cases) { await call(); const last=calls.at(-1); assert.equal(last.method,method); assert.equal(last.url.pathname,'/v1'+path); if(method==='POST') assert.match(last.headers['Idempotency-Key'],/^[a-f\d-]{36}$/); }
  assert.equal(calls[6].url.searchParams.get('to'),'a+b@example.com');
});
test('retry once on 503 and preserve generated UUID; 204 returns undefined', async () => {
  const keys=[];
  const client = new MonaMail('key',{fetch:async (url,init)=>{keys.push(init.headers['Idempotency-Key']);return keys.length===1 ? reply(503,{}, {'Retry-After':'0'}) : reply(204);}});
  assert.equal(await client.emails.cancel('e'), undefined); assert.equal(keys.length,2); assert.equal(keys[0],keys[1]);
});
test('body idempotency key and non-JSON errors', async () => {
  let key;
  const client = new MonaMail('key',{fetch:async (url,init)=>{key=init.headers['Idempotency-Key']; return new Response('upstream',{status:403,headers:{'X-Request-Id':'req_fallback'}});}});
  await assert.rejects(client.emails.send({...payload,idempotency_key:'from-body'}),e=>e.request_id==='req_fallback' && e.code==='internal_error');
  assert.equal(key,'from-body');
});
test('verify exact raw bytes, malformed signatures and optional 300s window', () => {
  const secret='whsec_example', timestamp='1788600000', body='{"text":"Xin chào"}';
  const signature='sha256='+createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
  const args={secret,timestamp,body,signature};
  assert.equal(MonaMail.verifyWebhook(args),true);
  assert.equal(MonaMail.verifyWebhook({...args,body:Buffer.from(body)}),true);
  for(const patch of [{body:body+' '},{secret:'wrong'},{signature:'sha256=00'},{signature:'sha256='+'z'.repeat(64)},{timestamp:'no'},{now:+timestamp+301},{now:+timestamp-301},{now:NaN}]) assert.equal(MonaMail.verifyWebhook({...args,...patch}),false);
  assert.equal(MonaMail.verifyWebhook({...args,now:+timestamp+300}),true);
});
test('CommonJS build exposes the same API',()=>{const {MonaMail}=createRequire(import.meta.url)('../dist/index.cjs'); assert.equal(typeof MonaMail.verifyWebhook,'function'); assert.equal(typeof new MonaMail('key').emails.send,'function');});
