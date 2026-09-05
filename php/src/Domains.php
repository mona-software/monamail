<?php
declare(strict_types=1);
namespace MonaMail;
class Domains extends Resource
{
    public function create(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', $body, [], $idempotencyKey); }
    public function cloudflare(string $id, array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/cloudflare', $body, [], $idempotencyKey); }
    public function list(): mixed
    { return $this->call('GET'); }
    public function get(string $id): mixed
    { return $this->call('GET', '/' . rawurlencode($id)); }
    public function remove(string $id): mixed
    { return $this->call('DELETE', '/' . rawurlencode($id)); }
    public function verify(string $id, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/verify', null, [], $idempotencyKey); }
}
