<?php
declare(strict_types=1);
namespace MonaMail;
class Webhook
{
    public static function verify(string $secret, string|int $timestamp, string $body, string $signature, ?int $now = null): bool
    {
        if ($secret === '' || !preg_match('/^[0-9]+$/D', (string)$timestamp) || !preg_match('/^sha256=[a-fA-F0-9]{64}$/D', $signature)) return false;
        if ($now !== null && abs($now - (int)$timestamp) > 300) return false;
        return hash_equals(hash_hmac('sha256', $timestamp . '.' . $body, $secret), strtolower(substr($signature, 7)));
    }
}
