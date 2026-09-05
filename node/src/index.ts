import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined };
export type Data = { [key: string]: Json | undefined };
export type Query = Record<string, string | number | boolean | undefined>;
export interface RequestOptions { idempotencyKey?: string; }
export interface ClientOptions { baseUrl?: string; timeoutMs?: number; fetch?: typeof globalThis.fetch; }
export interface SendEmail {
  from: string; to: string | string[]; cc?: string[]; bcc?: string[]; reply_to?: string | string[];
  subject?: string; html?: string; text?: string; template_id?: string; variables?: Data;
  headers?: Record<string, string>; attachments?: { filename: string; content: string; content_type?: string }[];
  tags?: string[]; unsubscribe_url?: string; scheduled_at?: string; idempotency_key?: string;
}
export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'suppressed' | 'failed' | 'sandbox';
export interface Email extends Data { id: string; status: EmailStatus; }
export interface EmailList { items: Email[]; next_cursor?: string | null; }
export interface Domain extends Data { id: string; domain: string; status: 'pending' | 'verified' | 'failed'; }
export interface TemplateInput { name: string; subject: string; html: string; text?: string; }
export interface WebhookInput { url: string; events: string[]; description?: string; }
export interface WebhookVerification { secret: string; timestamp: string | number; body: string | Uint8Array; signature: string; now?: number; }

export class MonaMailError extends Error {
  readonly status: number;
  readonly code: string;
  readonly next_step: string;
  readonly request_id: string;
  readonly details: unknown;
  constructor(status: number, payload: unknown, requestId = '') {
    const data = payload && typeof payload === 'object' ? payload as Data : {};
    super(typeof data.message === 'string' ? data.message : 'MONA Mail chưa xử lý được yêu cầu.');
    this.name = 'MonaMailError'; this.status = status;
    this.code = typeof data.code === 'string' ? data.code : 'internal_error';
    this.next_step = typeof data.next_step === 'string' ? data.next_step : 'Giữ request_id để kiểm tra cùng MONA Mail.';
    this.request_id = typeof data.request_id === 'string' ? data.request_id : requestId;
    this.details = payload;
  }
}

const pathId = (id: string) => encodeURIComponent(id);
export class MonaMail {
  private readonly key: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof globalThis.fetch;
  constructor(apiKey: string | undefined, options: ClientOptions = {}) {
    if (!apiKey?.trim()) throw new Error('Cần MONAMAIL_API_KEY hoặc JWT MONA Pass.');
    this.key = apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.monamail.vn').replace(/\/+$/, '').replace(/\/v1$/, '');
    this.timeoutMs = options.timeoutMs ?? 15000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error('timeoutMs phải lớn hơn 0.');
    this.fetcher = options.fetch ?? globalThis.fetch;
  }
  async request<T = Data>(method: string, path: string, body?: unknown, query?: Query, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/v1${path}`);
    for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
    const headers: Record<string, string> = { Authorization: `Bearer ${this.key}`, Accept: 'application/json', 'User-Agent': 'monamail-node/0.1.0' };
    const serialized = body === undefined ? undefined : JSON.stringify(body);
    if (serialized !== undefined) headers['Content-Type'] = 'application/json';
    if (method === 'POST') headers['Idempotency-Key'] = options.idempotencyKey ?? (body as SendEmail | undefined)?.idempotency_key ?? randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let response: Response; let raw: string;
      try {
        response = await this.fetcher(url.toString(), { method, headers, body: serialized, signal: controller.signal, redirect: 'error' });
        raw = await response.text();
      } finally { clearTimeout(timer); }
      let data: unknown;
      try { data = raw ? JSON.parse(raw) : undefined; } catch { data = undefined; }
      if (response.ok) return data as T;
      if (attempt === 0 && (response.status === 429 || response.status >= 500) && (method !== 'POST' || headers['Idempotency-Key'])) {
        const retryAfter = response.headers.get('Retry-After');
        let delay = retryAfter === null ? 500 : Number(retryAfter) * 1000;
        if (!Number.isFinite(delay)) delay = Date.parse(retryAfter!) - Date.now();
        if (!Number.isFinite(delay)) delay = 500;
        await new Promise(resolve => setTimeout(resolve, Math.max(0, delay)));
        continue;
      }
      throw new MonaMailError(response.status, data, response.headers.get('X-Request-Id') ?? '');
    }
    throw new Error('MONA Mail đã hết lượt thử lại.');
  }
  readonly emails = {
    send: (body: SendEmail, options?: RequestOptions) => this.request<Email>('POST', '/emails', body, undefined, options),
    get: (id: string) => this.request<Email>('GET', `/emails/${pathId(id)}`),
    list: (query?: Query) => this.request<EmailList>('GET', '/emails', undefined, query),
    cancel: (id: string, options?: RequestOptions) => this.request<void>('POST', `/emails/${pathId(id)}/cancel`, undefined, undefined, options),
    batch: (body: { emails: SendEmail[] } | SendEmail[], options?: RequestOptions) => this.request<{ results: Data[] }>('POST', '/emails/batch', Array.isArray(body) ? { emails: body } : body, undefined, options),
    events: (id: string) => this.request<Data[]>('GET', `/emails/${pathId(id)}/events`),
  };
  readonly domains = {
    create: (body: { domain: string }, options?: RequestOptions) => this.request<Domain>('POST', '/domains', body, undefined, options),
    get: (id: string) => this.request<Domain>('GET', `/domains/${pathId(id)}`),
    list: () => this.request<Domain[]>('GET', '/domains'),
    verify: (id: string, options?: RequestOptions) => this.request<Domain>('POST', `/domains/${pathId(id)}/verify`, undefined, undefined, options),
    remove: (id: string) => this.request<void>('DELETE', `/domains/${pathId(id)}`),
    cloudflare: (id: string, body: { api_token: string }, options?: RequestOptions) => this.request('POST', `/domains/${pathId(id)}/cloudflare`, body, undefined, options),
  };
  readonly apiKeys = {
    list: () => this.request<Data[]>('GET', '/api-keys'),
    create: (body: { name: string; mode: 'live' | 'test' }, options?: RequestOptions) => this.request('POST', '/api-keys', body, undefined, options),
    rotate: (id: string, options?: RequestOptions) => this.request('POST', `/api-keys/${pathId(id)}/rotate`, undefined, undefined, options),
    revoke: (id: string) => this.request<void>('DELETE', `/api-keys/${pathId(id)}`),
  };
  readonly webhooks = {
    create: (body: WebhookInput, options?: RequestOptions) => this.request('POST', '/webhooks', body, undefined, options),
    list: () => this.request<Data[]>('GET', '/webhooks'),
    test: (id: string, options?: RequestOptions) => this.request('POST', `/webhooks/${pathId(id)}/test`, undefined, undefined, options),
    rotate: (id: string, options?: RequestOptions) => this.request('POST', `/webhooks/${pathId(id)}/rotate`, undefined, undefined, options),
    remove: (id: string) => this.request<void>('DELETE', `/webhooks/${pathId(id)}`),
    deliveries: (id: string, query?: Query) => this.request<Data[]>('GET', `/webhooks/${pathId(id)}/deliveries`, undefined, query),
  };
  readonly suppressions = {
    list: (query?: Query) => this.request('GET', '/suppressions', undefined, query),
    add: (body: { email: string; reason?: 'manual' }, options?: RequestOptions) => this.request('POST', '/suppressions', { reason: 'manual', ...body }, undefined, options),
    remove: (email: string) => this.request<void>('DELETE', `/suppressions/${pathId(email)}`),
  };
  readonly templates = {
    create: (body: TemplateInput, options?: RequestOptions) => this.request('POST', '/templates', body, undefined, options),
    get: (id: string) => this.request('GET', `/templates/${pathId(id)}`),
    list: () => this.request<Data[]>('GET', '/templates'),
    update: (id: string, body: Partial<TemplateInput>) => this.request('PUT', `/templates/${pathId(id)}`, body),
    remove: (id: string) => this.request<void>('DELETE', `/templates/${pathId(id)}`),
    render: (id: string, body: { variables: Data }, options?: RequestOptions) => this.request('POST', `/templates/${pathId(id)}/render`, body, undefined, options),
  };
  readonly account = { get: () => this.request('GET', '/account'), setPlan: (plan: string) => this.request('PUT', '/account/plan', { plan }) };
  readonly plans = { list: () => this.request<Data[]>('GET', '/plans') };
  readonly stats = { get: (query?: Query) => this.request('GET', '/stats', undefined, query) };
  static verifyWebhook({ secret, timestamp, body, signature, now }: WebhookVerification): boolean {
    if (!secret || !/^\d+$/.test(String(timestamp)) || !/^sha256=[a-f\d]{64}$/i.test(signature)) return false;
    const stamp = Number(timestamp);
    if (!Number.isSafeInteger(stamp) || (now !== undefined && (!Number.isFinite(now) || Math.abs(now - stamp) > 300))) return false;
    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();
    const received = Buffer.from(signature.slice(7), 'hex');
    return received.length === expected.length && timingSafeEqual(expected, received);
  }
}
export const verifyWebhook = MonaMail.verifyWebhook;
export default MonaMail;
