<?php
declare(strict_types=1);
namespace MonaMail;
class Webhooks extends Resource
{
    public function create(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', $body, [], $idempotencyKey); }
    public function deliveries(string $id, array $query = []): mixed
    { return $this->call('GET', '/' . rawurlencode($id) . '/deliveries', null, $query); }
    public function list(): mixed
    { return $this->call('GET'); }
    public function remove(string $id): mixed
    { return $this->call('DELETE', '/' . rawurlencode($id)); }
    public function test(string $id, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/test', null, [], $idempotencyKey); }
    public function rotate(string $id, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/rotate', null, [], $idempotencyKey); }
}
