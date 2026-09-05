<?php
/** Plugin Name: MONA Mail wp_mail
 * Đặt MONAMAIL_API_KEY và MONAMAIL_FROM trong wp-config.php hoặc môi trường server.
 */
if (!defined('ABSPATH')) exit;
add_filter('pre_wp_mail', function ($pre, $atts) {
    if ($pre !== null) return $pre;
    $key = defined('MONAMAIL_API_KEY') ? MONAMAIL_API_KEY : getenv('MONAMAIL_API_KEY');
    $from = defined('MONAMAIL_FROM') ? MONAMAIL_FROM : getenv('MONAMAIL_FROM');
    $fail = function ($message) use ($atts) {
        do_action('wp_mail_failed', new WP_Error('monamail_error', $message, ['subject' => $atts['subject']]));
        return false;
    };
    if (!$key || !$from) return $fail('Cần MONAMAIL_API_KEY và MONAMAIL_FROM.');
    // str_getcsv giữ tên hiển thị có dấu phẩy trong dấu nháy kép.
    $addresses = fn($value) => is_array($value) ? array_values($value) : array_map('trim', str_getcsv($value, ',', '"', ''));
    $body = ['from' => $from, 'to' => $addresses($atts['to']), 'subject' => $atts['subject']];
    $headers = $atts['headers'] ?? [];
    if (!is_array($headers)) $headers = preg_split('/\r?\n/', $headers);
    $contentType = apply_filters('wp_mail_content_type', 'text/plain');
    foreach ($headers as $line) {
        $parts = explode(':', $line, 2);
        if (count($parts) !== 2) continue;
        [$name, $value] = [strtolower(trim($parts[0])), trim($parts[1])];
        if ($name === 'content-type') $contentType = $value;
        elseif ($name === 'from') $body['from'] = $value;
        elseif (in_array($name, ['cc', 'bcc', 'reply-to'], true)) {
            $field = $name === 'reply-to' ? 'reply_to' : $name;
            $body[$field] = array_merge($body[$field] ?? [], $addresses($value));
        }
    }
    $body[stripos($contentType, 'text/html') !== false ? 'html' : 'text'] = $atts['message'];
    $attachments = $atts['attachments'] ?? [];
    if (!is_array($attachments)) $attachments = array_filter(preg_split('/\r?\n/', $attachments));
    $total = 0;
    foreach ($attachments as $path) {
        if (!is_string($path) || !is_readable($path) || !is_file($path)) return $fail('Không đọc được file đính kèm.');
        $total += filesize($path);
        if ($total > 10 * 1024 * 1024) return $fail('File đính kèm vượt 10 MB.');
        $content = file_get_contents($path);
        if ($content === false) return $fail('Không đọc được file đính kèm.');
        $body['attachments'][] = ['filename' => basename($path), 'content' => base64_encode($content)];
    }
    $response = wp_remote_post('https://api.monamail.vn/v1/emails', ['timeout' => 15, 'redirection' => 0,
        'headers' => ['Authorization' => 'Bearer ' . $key, 'Content-Type' => 'application/json', 'Idempotency-Key' => wp_generate_uuid4()],
        'body' => wp_json_encode($body)]);
    if (is_wp_error($response)) return $fail('Không kết nối được MONA Mail.');
    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) return $fail('MONA Mail chưa nhận yêu cầu gửi. HTTP ' . $status);
    do_action('wp_mail_succeeded', $atts);
    return true;
}, 10, 2);
