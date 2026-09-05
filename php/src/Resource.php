<?php
declare(strict_types=1);
namespace MonaMail;
class Resource
{
    public function __construct(protected Client $client, protected string $path) {}
    protected function call(string $method, string $suffix = '', ?array $body = null, array $query = [], ?string $idempotencyKey = null): mixed
    { return $this->client->request($method, $this->path . $suffix, $body, $query, $idempotencyKey); }
}
