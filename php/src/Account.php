<?php
declare(strict_types=1);
namespace MonaMail;
class Account extends Resource
{
    public function get(): mixed
    { return $this->call('GET'); }
    public function setPlan(string $plan): mixed
    { return $this->call('PUT', '/plan', ['plan' => $plan]); }
}
