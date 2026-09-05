<?php
declare(strict_types=1);
namespace MonaMail;

class Client
{
    public Emails $emails;
    public Domains $domains;
    public ApiKeys $apiKeys;
    public Webhooks $webhooks;
    public Suppressions $suppressions;
    public Templates $templates;
    public Account $account;
    public Plans $plans;
    public Stats $stats;
    private string $baseUrl;
    private $transport;
    public function __construct(private string $apiKey, string $baseUrl = 'https://api.monamail.vn', private float $timeout = 15, ?callable $transport = null)
    {
        if (trim($apiKey) === '' || $timeout <= 0) throw new \InvalidArgumentException('Cần API key và timeout lớn hơn 0.');
        $this->baseUrl = preg_replace('~/v1$~', '', rtrim($baseUrl, '/'));
        $this->transport = $transport;
        $this->emails = new Emails($this, '/emails');
        $this->domains = new Domains($this, '/domains');
        $this->apiKeys = new ApiKeys($this, '/api-keys');
        $this->webhooks = new Webhooks($this, '/webhooks');
        $this->suppressions = new Suppressions($this, '/suppressions');
        $this->templates = new Templates($this, '/templates');
        $this->account = new Account($this, '/account');
        $this->plans = new Plans($this, '/plans');
        $this->stats = new Stats($this, '/stats');
    }
    public function request(string $method, string $path, ?array $body = null, array $query = [], ?string $idempotencyKey = null): mixed
    {
        $url = $this->baseUrl . '/v1' . $path;
        $query = array_filter($query, fn($v) => $v !== null);
        if ($query) $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        $headers = ['Authorization' => 'Bearer ' . $this->apiKey, 'Accept' => 'application/json', 'User-Agent' => 'monamail-php/0.1.0'];
        $raw = $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        if ($raw !== null) $headers['Content-Type'] = 'application/json';
        if ($method === 'POST') $headers['Idempotency-Key'] = $idempotencyKey ?? $body['idempotency_key'] ?? bin2hex(random_bytes(16));
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $result = $this->transport ? ($this->transport)($method, $url, $headers, $raw, $this->timeout) : $this->curl($method, $url, $headers, $raw);
            $status = $result['status'];
            $responseHeaders = array_change_key_case($result['headers'] ?? [], CASE_LOWER);
            $data = json_decode($result['body'] ?? '', true);
            if ($status >= 200 && $status < 300) return $data;
            $mapped = new MonaMailError($status, $data, $responseHeaders['x-request-id'] ?? '');
            if ($attempt === 0 && ($status === 429 || $status >= 500)) {
                $after = $responseHeaders['retry-after'] ?? null;
                $parsed = $after === null ? false : strtotime($after);
                $delay = $after === null ? 0.5 : (is_numeric($after) ? (float)$after : ($parsed === false ? 0.5 : $parsed - time()));
                usleep((int)(max(0, $delay) * 1000000));
                continue;
            }
            throw $mapped;
        }
        throw new \RuntimeException('MONA Mail đã hết lượt thử lại.');
    }
    private function curl(string $method, string $url, array $headers, ?string $raw): array
    {
        if (!function_exists('curl_init')) throw new \RuntimeException('Cần PHP extension curl.');
        $ch = curl_init($url);
        $responseHeaders = [];
        curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS => (int)($this->timeout * 1000), CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HTTPHEADER => array_map(fn($k, $v) => "$k: $v", array_keys($headers), $headers),
            CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$responseHeaders) {
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                return strlen($line);
            }]);
        if ($raw !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $raw);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $failed = $response === false;
        curl_close($ch);
        if ($failed) throw new \RuntimeException('Không kết nối được MONA Mail. Kiểm tra mạng và timeout.');
        return ['status' => $status, 'headers' => $responseHeaders, 'body' => $response];
    }
}
