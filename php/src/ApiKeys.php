<?php
declare(strict_types=1);
namespace MonaMail;
class ApiKeys extends Resource
{
    public function create(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', $body, [], $idempotencyKey); }
    public function revoke(string $id): mixed
    { return $this->call('DELETE', '/' . rawurlencode($id)); }
    public function list(): mixed
    { return $this->call('GET'); }
    public function rotate(string $id, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/rotate', null, [], $idempotencyKey); }
}
