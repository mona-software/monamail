<?php
declare(strict_types=1);
namespace MonaMail;

class MonaMailError extends \RuntimeException
{
    public int $status;
    // Exception::$code is numeric. Keep the contract's string code accessible as $error->code.
    private string $apiCode;
    public string $next_step;
    public string $request_id;
    public mixed $details;
    public function __construct(int $status, mixed $payload = null, string $requestId = '')
    {
        $data = is_array($payload) ? $payload : [];
        parent::__construct($data['message'] ?? 'MONA Mail chưa xử lý được yêu cầu.', $status);
        $this->status = $status;
        $this->apiCode = $data['code'] ?? 'internal_error';
        $this->next_step = $data['next_step'] ?? 'Giữ request_id để kiểm tra cùng MONA Mail.';
        $this->request_id = $data['request_id'] ?? $requestId;
        $this->details = $payload;
    }
    public function __get(string $name): mixed
    {
        return match ($name) { 'code' => $this->apiCode, 'message' => $this->getMessage(), default => null };
    }
}
