<?php
declare(strict_types=1);
spl_autoload_register(function ($class) { $path = __DIR__ . '/../src/' . substr($class, strlen('MonaMail\\')) . '.php'; if (is_file($path)) require $path; });
function check(bool $value, string $message): void { if (!$value) throw new RuntimeException($message); }
$calls = [];
$client = new MonaMail\Client('mm_test_example', 'https://example.test', 15, function ($method, $url, $headers, $body) use (&$calls) {
    $calls[] = compact('method','url','headers','body');
    return count($calls) === 1 ? ['status'=>429,'headers'=>['Retry-After'=>'0'],'body'=>'{"code":"rate_limited"}'] : ['status'=>201,'body'=>'{"id":"em_1"}'];
});
check($client->emails->send(['from'=>'onboarding@monamail.vn','to'=>'owner@example.com','subject'=>'OTP','text'=>'123456'],'otp-1')['id'] === 'em_1','send result');
check(count($calls) === 2 && $calls[0]['headers']['Idempotency-Key'] === $calls[1]['headers']['Idempotency-Key'],'stable retry');
check($calls[0]['headers']['Authorization'] === 'Bearer mm_test_example','auth');
check(json_decode($calls[0]['body'],true)['text'] === '123456','body');
foreach ([402=>'quota_exceeded',403=>'domain_not_verified'] as $status=>$code) {
    $client = new MonaMail\Client('key','https://example.test',15,fn()=>['status'=>$status,'headers'=>['X-Request-Id'=>'req_1'],'body'=>json_encode(['code'=>$code,'message'=>'Không gửi được.','next_step'=>'Kiểm tra tài khoản.'])]);
    try { $client->account->get(); throw new RuntimeException('Missing exception'); } catch (MonaMail\MonaMailError $e) { check($e->status===$status && $e->code===$code && $e->request_id==='req_1','error mapping'); }
}
$body='{"text":"Xin chào"}'; $ts=1788600000; $signature='sha256='.hash_hmac('sha256',$ts.'.'.$body,'secret');
check(MonaMail\Webhook::verify('secret',$ts,$body,$signature,$ts+300),'valid signature');
check(!MonaMail\Webhook::verify('secret',$ts,$body.' ',$signature),'invalid body');
check(!MonaMail\Webhook::verify('wrong',$ts,$body,$signature),'wrong key');
check(!MonaMail\Webhook::verify('secret',$ts,$body,'sha256=00'),'short signature');
check(!MonaMail\Webhook::verify('secret',$ts,$body,$signature,$ts+301),'expired signature');
echo "PASS PHP smoke\n";
