<?php
declare(strict_types=1);
namespace MonaMail;
class Suppressions extends Resource
{
    public function list(array $query = []): mixed
    { return $this->call('GET', '', null, $query); }
    public function add(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', array_merge(['reason' => 'manual'], $body), [], $idempotencyKey); }
    public function remove(string $email): mixed
    { return $this->call('DELETE', '/' . rawurlencode($email)); }
}
