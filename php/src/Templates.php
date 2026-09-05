<?php
declare(strict_types=1);
namespace MonaMail;
class Templates extends Resource
{
    public function create(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', $body, [], $idempotencyKey); }
    public function update(string $id, array $body): mixed
    { return $this->call('PUT', '/' . rawurlencode($id), $body); }
    public function render(string $id, array $variables, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/render', ['variables' => (object)$variables], [], $idempotencyKey); }
    public function list(): mixed
    { return $this->call('GET'); }
    public function get(string $id): mixed
    { return $this->call('GET', '/' . rawurlencode($id)); }
    public function remove(string $id): mixed
    { return $this->call('DELETE', '/' . rawurlencode($id)); }
}
