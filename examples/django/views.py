import hashlib
import json
import os
import secrets
import uuid
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils.crypto import salted_hmac
from django.views.decorators.http import require_POST
from monamail import MonaMail, MonaMailError

@require_POST
def send_otp(request):
    # Giữ CSRF middleware; production dùng cache Redis để cache.add có tính nguyên tử giữa worker.
    try:
        data = json.loads(request.body)
        email = data['email'].strip().lower()
        validate_email(email)
    except (ValueError, KeyError, TypeError, AttributeError, ValidationError):
        return JsonResponse({'error': 'Email chưa hợp lệ.'}, status=400)
    cache_key = hashlib.sha256(email.encode()).hexdigest()
    if not cache.add('otp-rate:' + cache_key, True, timeout=60):
        response = JsonResponse({'error': 'Chờ 60 giây rồi thử lại.'}, status=429)
        response['Retry-After'] = '60'
        return response
    otp = str(secrets.randbelow(900000) + 100000)
    cache.set('otp:' + cache_key, {'digest': salted_hmac('otp', email + ':' + otp).hexdigest(), 'attempts': 0}, timeout=300)
    # Endpoint xác minh cần so sánh hằng thời gian, giới hạn 5 lượt, xoá OTP khi thành công.
    try:
        sent = MonaMail(os.environ['MONAMAIL_API_KEY']).emails.send({
            'from': os.environ.get('MONAMAIL_FROM', 'onboarding@monamail.vn'), 'to': email,
            'subject': 'Mã OTP', 'text': f'Mã OTP của anh chị: {otp}. Hết hạn sau 5 phút.', 'tags': ['otp']
        }, idempotency_key='otp-' + str(uuid.uuid4()))
        return JsonResponse({'id': sent['id'], 'status': sent['status']}, status=202)
    except MonaMailError as exc:
        return JsonResponse({'error': 'Chưa gửi được OTP.', 'request_id': exc.request_id}, status=503)
