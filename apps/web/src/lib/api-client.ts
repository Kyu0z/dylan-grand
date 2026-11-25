import { notify } from './toast';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api/v1' : '')).replace(/\/+$/, '');
const genericError = 'Something went wrong. Please try again.';
export class ApiError extends Error {
  readonly messages: string[];
  constructor(public readonly status: number, message: string | string[], public readonly code?: string) {
    const messages = (Array.isArray(message) ? message : [message]).filter(Boolean);
    super(messages[0] || genericError);
    this.name = 'ApiError';
    this.messages = messages.length ? messages : [genericError];
  }
}
export function errorMessages(error: unknown): string[] {
  return error instanceof ApiError ? error.messages : [genericError];
}
function readMessages(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return [];
}
function getHeaderMessage(response: Response) {
  const raw = response.headers.get('X-Dylan-Message');
  if (!raw) return '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}
export type ApiResult<T> = { data: T; messages: string[]; };
type Options = { method?: string; body?: object; token?: string; notifications?: 'all' | 'errors' | 'none'; };

/** Shared customer REST client. Mutations notify on success and failure by default;
 * GET only notifies on failure. Background requests can explicitly opt out. */
export async function apiRequest<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, token, notifications = ['GET', 'HEAD'].includes(method.toUpperCase()) ? 'errors' : 'all' } = options;
  try {
    if (!apiUrl) throw new ApiError(0, 'API URL is not configured.');
    let response: Response;
    try {
      response = await fetch(`${apiUrl}${path}`, {
        method, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(100_000),
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new ApiError(0, 'Unable to connect. Please try again.'); }
    let payload: unknown;
    try { payload = response.status === 204 ? undefined : await response.json(); }
    catch { if (response.ok) throw new ApiError(response.status, 'The server returned an invalid response. Please try again.'); }
    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const messages = readMessages(record.message);
    if (!response.ok) {
      throw new ApiError(response.status, messages.length ? messages : [genericError], typeof record.code === 'string' ? record.code : undefined);
    }
    const header = getHeaderMessage(response);
    const result = { data: payload as T, messages: messages.length ? messages : [header || 'Request completed successfully.'] };
    if (notifications === 'all') notify('success', result.messages);
    return result;
  } catch (error) {
    if (notifications !== 'none') notify('error', errorMessages(error));
    throw error;
  }
}
