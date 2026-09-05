"""MONA Mail 0.1.0. HTTP transport uses only the Python standard library."""
import json
import math
import time
import uuid
from datetime import timezone
from email.utils import parsedate_to_datetime
from urllib import request, error, parse


class MonaMailError(Exception):
    def __init__(self, status, payload=None, request_id=''):
        data = payload if isinstance(payload, dict) else {}
        self.status = status
        self.code = data.get('code', 'internal_error')
        self.message = data.get('message', 'MONA Mail chưa xử lý được yêu cầu.')
        self.next_step = data.get('next_step', 'Giữ request_id để kiểm tra cùng MONA Mail.')
        self.request_id = data.get('request_id', request_id)
        self.details = payload
        super().__init__(self.message)


def _id(value):
    return parse.quote(str(value), safe='')


class Resource:
    def __init__(self, client, path):
        self.client, self.path = client, path

    def _call(self, method, suffix='', body=None, query=None, idempotency_key=None):
        return self.client.request(method, self.path + suffix, body, query, idempotency_key)


class Emails(Resource):
    def send(self, body=None, *, idempotency_key=None, **fields):
        return self._call('POST', body={**(body or {}), **fields}, idempotency_key=idempotency_key)

    def get(self, email_id):
        return self._call('GET', '/' + _id(email_id))

    def list(self, **query):
        return self._call('GET', query=query)

    def cancel(self, email_id, *, idempotency_key=None):
        return self._call('POST', '/' + _id(email_id) + '/cancel', idempotency_key=idempotency_key)

    def batch(self, emails, *, idempotency_key=None):
        return self._call('POST', '/batch', body=emails if isinstance(emails, dict) else {'emails': emails}, idempotency_key=idempotency_key)

    def events(self, email_id):
        return self._call('GET', '/' + _id(email_id) + '/events')


class Domains(Resource):
    def create(self, domain, *, idempotency_key=None):
        return self._call('POST', body={'domain': domain}, idempotency_key=idempotency_key)

    def get(self, domain_id):
        return self._call('GET', '/' + _id(domain_id))

    def list(self):
        return self._call('GET')

    def verify(self, domain_id, *, idempotency_key=None):
        return self._call('POST', '/' + _id(domain_id) + '/verify', idempotency_key=idempotency_key)

    def remove(self, domain_id):
        return self._call('DELETE', '/' + _id(domain_id))

    def cloudflare(self, domain_id, api_token, *, idempotency_key=None):
        return self._call('POST', '/' + _id(domain_id) + '/cloudflare', {'api_token': api_token}, idempotency_key=idempotency_key)


class ApiKeys(Resource):
    def list(self):
        return self._call('GET')

    def create(self, name, mode='test', *, idempotency_key=None):
        return self._call('POST', body={'name': name, 'mode': mode}, idempotency_key=idempotency_key)

    def rotate(self, key_id, *, idempotency_key=None):
        return self._call('POST', '/' + _id(key_id) + '/rotate', idempotency_key=idempotency_key)

    def revoke(self, key_id):
        return self._call('DELETE', '/' + _id(key_id))


class Webhooks(Resource):
    def create(self, url, events, description=None, *, idempotency_key=None):
        body = {'url': url, 'events': events}
        if description is not None:
            body['description'] = description
        return self._call('POST', body=body, idempotency_key=idempotency_key)

    def list(self):
        return self._call('GET')

    def test(self, webhook_id, *, idempotency_key=None):
        return self._call('POST', '/' + _id(webhook_id) + '/test', idempotency_key=idempotency_key)

    def rotate(self, webhook_id, *, idempotency_key=None):
        return self._call('POST', '/' + _id(webhook_id) + '/rotate', idempotency_key=idempotency_key)

    def remove(self, webhook_id):
        return self._call('DELETE', '/' + _id(webhook_id))

    def deliveries(self, webhook_id, **query):
        return self._call('GET', '/' + _id(webhook_id) + '/deliveries', query=query)


class Suppressions(Resource):
    def list(self, **query):
        return self._call('GET', query=query)

    def add(self, email, reason='manual', *, idempotency_key=None):
        return self._call('POST', body={'email': email, 'reason': reason}, idempotency_key=idempotency_key)

    def remove(self, email):
        return self._call('DELETE', '/' + _id(email))


class Templates(Resource):
    def create(self, name, subject, html, text=None, *, idempotency_key=None):
        body = {'name': name, 'subject': subject, 'html': html}
        if text is not None:
            body['text'] = text
        return self._call('POST', body=body, idempotency_key=idempotency_key)

    def get(self, template_id):
        return self._call('GET', '/' + _id(template_id))

    def list(self):
        return self._call('GET')

    def update(self, template_id, **fields):
        return self._call('PUT', '/' + _id(template_id), fields)

    def remove(self, template_id):
        return self._call('DELETE', '/' + _id(template_id))

    def render(self, template_id, variables, *, idempotency_key=None):
        return self._call('POST', '/' + _id(template_id) + '/render', {'variables': variables}, idempotency_key=idempotency_key)


class Account(Resource):
    def get(self):
        return self._call('GET')

    def set_plan(self, plan):
        return self._call('PUT', '/plan', {'plan': plan})


class Plans(Resource):
    def list(self):
        return self._call('GET')


class Stats(Resource):
    def get(self, **query):
        return self._call('GET', query=query)


class _NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


# Keep a module-level urlopen seam for offline tests; never forward a key on redirects.
urlopen = request.build_opener(_NoRedirect).open


class MonaMail:
    def __init__(self, api_key, base_url='https://api.monamail.vn', timeout=15):
        if not api_key or not api_key.strip():
            raise ValueError('Cần MONAMAIL_API_KEY hoặc JWT MONA Pass.')
        if timeout <= 0:
            raise ValueError('timeout phải lớn hơn 0.')
        self.api_key, self.timeout = api_key, timeout
        self.base_url = base_url.rstrip('/')
        if self.base_url.endswith('/v1'):
            self.base_url = self.base_url[:-3]
        for attr, kind, path in [('emails', Emails, 'emails'), ('domains', Domains, 'domains'),
                                 ('api_keys', ApiKeys, 'api-keys'), ('webhooks', Webhooks, 'webhooks'),
                                 ('suppressions', Suppressions, 'suppressions'), ('templates', Templates, 'templates'),
                                 ('account', Account, 'account'), ('plans', Plans, 'plans'), ('stats', Stats, 'stats')]:
            setattr(self, attr, kind(self, '/' + path))

    def request(self, method, path, body=None, query=None, idempotency_key=None):
        url = self.base_url + '/v1' + path
        if query:
            url += '?' + parse.urlencode({k: v for k, v in query.items() if v is not None})
        headers = {'Authorization': 'Bearer ' + self.api_key, 'Accept': 'application/json', 'User-Agent': 'monamail-python/0.1.0'}
        data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
        if data is not None:
            headers['Content-Type'] = 'application/json'
        if method == 'POST':
            headers['Idempotency-Key'] = idempotency_key or (body or {}).get('idempotency_key') or str(uuid.uuid4())
        for attempt in range(2):
            req = request.Request(url, data=data, headers=headers, method=method)
            try:
                with urlopen(req, timeout=self.timeout) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else None
            except error.HTTPError as exc:
                raw = exc.read()
                try:
                    payload = json.loads(raw) if raw else None
                except (ValueError, UnicodeDecodeError):
                    payload = None
                mapped = MonaMailError(exc.code, payload, exc.headers.get('X-Request-Id', ''))
                if attempt == 0 and (exc.code == 429 or exc.code >= 500):
                    after = exc.headers.get('Retry-After')
                    try:
                        delay = float(after) if after is not None else 0.5
                    except ValueError:
                        try:
                            date = parsedate_to_datetime(after)
                            delay = date.replace(tzinfo=date.tzinfo or timezone.utc).timestamp() - time.time()
                        except (TypeError, ValueError, OverflowError):
                            delay = 0.5
                    if not math.isfinite(delay):
                        delay = 0.5
                    time.sleep(max(0, delay))
                    continue
                raise mapped from None
