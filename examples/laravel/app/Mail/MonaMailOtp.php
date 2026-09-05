<?php
namespace App\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use MonaMail\Client;
final class MonaMailOtp
{
    public function send(string $email): array
    {
        $email = strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) abort(422, 'Email chưa hợp lệ.');
        $key = hash('sha256', $email);
        // Production dùng Redis; thêm giới hạn 5 lần nhập ở endpoint xác minh OTP.
        if (!Cache::add('otp-rate:' . $key, true, 60)) abort(429, 'Chờ 60 giây rồi thử lại.');
        $otp = (string) random_int(100000, 999999);
        Cache::put('otp:' . $key, ['digest' => Hash::make($otp), 'attempts' => 0], 300);
        $client = new Client(config('services.monamail.key'));
        return $client->emails->send(['from' => config('services.monamail.from', 'onboarding@monamail.vn'), 'to' => $email, 'subject' => 'Mã OTP', 'text' => "Mã OTP của anh chị: $otp. Hết hạn sau 5 phút.", 'tags' => ['otp']], 'otp-' . Str::uuid());
    }
}
