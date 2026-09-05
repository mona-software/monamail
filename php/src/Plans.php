<?php
declare(strict_types=1);
namespace MonaMail;
class Plans extends Resource
{
    public function list(): mixed
    { return $this->call('GET'); }
}
