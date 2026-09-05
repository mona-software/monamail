<?php
declare(strict_types=1);
namespace MonaMail;
class Emails extends Resource
{
    public function send(array $body, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '', $body, [], $idempotencyKey); }
    public function get(string $id): mixed
    { return $this->call('GET', '/' . rawurlencode($id)); }
    public function list(array $query = []): mixed
    { return $this->call('GET', '', null, $query); }
    public function cancel(string $id, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/' . rawurlencode($id) . '/cancel', null, [], $idempotencyKey); }
    public function batch(array $emails, ?string $idempotencyKey = null): mixed
    { return $this->call('POST', '/batch', ['emails' => $emails], [], $idempotencyKey); }
    public function events(string $id): mixed
    { return $this->call('GET', '/' . rawurlencode($id) . '/events'); }
}
