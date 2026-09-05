<?php
declare(strict_types=1);
namespace MonaMail;
class Stats extends Resource
{
    public function get(array $query = []): mixed
    { return $this->call('GET', '', null, $query); }
}
