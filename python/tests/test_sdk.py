import hashlib
import hmac
import io
import json
from urllib.error import HTTPError
from unittest.mock import patch
import pytest
from monamail import MonaMail, MonaMailError, verify_webhook

class Response:
    def __init__(self, data=None): self.data = data
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return json.dumps(self.data).encode() if self.data is not None else b''

def failure(status, code):
    return HTTPError('https://api.monamail.vn/v1/emails', status, 'error', {'Retry-After':'0','X-Request-Id':'req_1'}, io.BytesIO(json.dumps({'code':code,'message':'Không gửi được.','next_step':'Kiểm tra tài khoản.'}).encode()))

def test_send_retry():
    with patch('monamail.client.urlopen', side_effect=[failure(429,'rate_limited'), Response({'id':'em_1'})]) as send:
        result = MonaMail('test').emails.send({'from':'onboarding@monamail.vn','to':'owner@example.com','subject':'OTP','text':'123456'}, idempotency_key='otp-1')
    assert result['id'] == 'em_1'
    assert send.call_count == 2
    for call in send.call_args_list:
        req = call.args[0]
        assert req.full_url == 'https://api.monamail.vn/v1/emails'
        assert req.get_header('Authorization') == 'Bearer test'
        assert req.get_header('Idempotency-key') == 'otp-1'
        assert json.loads(req.data)['text'] == '123456'

@pytest.mark.parametrize('status,code',[(402,'quota_exceeded'),(403,'domain_not_verified')])
def test_errors(status,code):
    with patch('monamail.client.urlopen', side_effect=failure(status,code)) as send:
        with pytest.raises(MonaMailError) as caught: MonaMail('test').emails.send({'from':'a@b.vn'})
    assert send.call_count == 1
    e = caught.value
    assert (e.status,e.code,e.next_step,e.request_id) == (status,code,'Kiểm tra tài khoản.','req_1')

def test_routes_and_post_keys():
    client = MonaMail('test', base_url='https://example.test/v1/')
    cases=[
        ('GET','/account',lambda:client.account.get()), ('PUT','/account/plan',lambda:client.account.set_plan('free')),
        ('GET','/plans',lambda:client.plans.list()), ('GET','/stats',lambda:client.stats.get(**{'from':'2026-09-01'})),
        ('POST','/domains',lambda:client.domains.create(domain='shop.vn')), ('GET','/domains/d',lambda:client.domains.get('d')),
        ('GET','/domains',lambda:client.domains.list()),('POST','/domains/d/verify',lambda:client.domains.verify('d')),
        ('POST','/domains/d/cloudflare',lambda:client.domains.cloudflare('d',api_token='cf')),('DELETE','/domains/d',lambda:client.domains.remove('d')),
        ('GET','/api-keys',lambda:client.api_keys.list()),('POST','/api-keys',lambda:client.api_keys.create('app')),
        ('POST','/api-keys/k/rotate',lambda:client.api_keys.rotate('k')),('DELETE','/api-keys/k',lambda:client.api_keys.revoke('k')),
        ('POST','/webhooks',lambda:client.webhooks.create('https://shop.vn/hook',['email.bounced'])),('GET','/webhooks',lambda:client.webhooks.list()),
        ('POST','/webhooks/w/test',lambda:client.webhooks.test('w')),('POST','/webhooks/w/rotate',lambda:client.webhooks.rotate('w')),
        ('GET','/webhooks/w/deliveries',lambda:client.webhooks.deliveries('w',limit=10)),('DELETE','/webhooks/w',lambda:client.webhooks.remove('w')),
        ('GET','/suppressions',lambda:client.suppressions.list()),('POST','/suppressions',lambda:client.suppressions.add('a@example.com')),
        ('DELETE','/suppressions/a%2Bb%40example.com',lambda:client.suppressions.remove('a+b@example.com')),
        ('POST','/templates',lambda:client.templates.create('otp','OTP','<b>OTP</b>')),('GET','/templates/t',lambda:client.templates.get('t')),
        ('GET','/templates',lambda:client.templates.list()),('PUT','/templates/t',lambda:client.templates.update('t',subject='New')),
        ('POST','/templates/t/render',lambda:client.templates.render('t',{'name':'An'})),('DELETE','/templates/t',lambda:client.templates.remove('t')),
        ('GET','/emails/e',lambda:client.emails.get('e')),('GET','/emails',lambda:client.emails.list(limit=20)),
        ('POST','/emails/e/cancel',lambda:client.emails.cancel('e')),('POST','/emails/batch',lambda:client.emails.batch([])),('GET','/emails/e/events',lambda:client.emails.events('e')),
    ]
    with patch('monamail.client.urlopen',return_value=Response()) as send:
        for method,path,call in cases:
            assert call() is None
            req=send.call_args.args[0]
            assert req.method==method
            assert req.full_url.split('?')[0]=='https://example.test/v1'+path
            if method=='POST': assert len(req.get_header('Idempotency-key'))==36

def test_generated_key_stable_on_503():
    with patch('monamail.client.urlopen',side_effect=[failure(503,'internal_error'),Response()]) as send:
        MonaMail('test').emails.cancel('e')
    keys=[c.args[0].get_header('Idempotency-key') for c in send.call_args_list]
    assert keys[0]==keys[1] and len(keys[0])==36

def test_webhook():
    secret='secret'; timestamp='1788600000'; body='{"text":"Xin chào"}'
    sig='sha256='+hmac.new(secret.encode(),f'{timestamp}.{body}'.encode(),hashlib.sha256).hexdigest()
    assert verify_webhook(secret,timestamp,body,sig)
    assert verify_webhook(secret,timestamp,body.encode(),sig,now=int(timestamp)+300)
    assert not verify_webhook(secret,timestamp,body+' ',sig)
    assert not verify_webhook('wrong',timestamp,body,sig)
    assert not verify_webhook(secret,timestamp,body,'sha256=00')
    assert not verify_webhook(secret,timestamp,body,sig,now=int(timestamp)+301)
    assert not verify_webhook(secret,timestamp,body,sig,now=int(timestamp)-301)
