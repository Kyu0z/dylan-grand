export class ApiError extends Error { constructor(public status: number, public messages: string[]) { super(messages.join('\n')); } }
export async function request<T>(base: string, path: string, options: { method?: string; body?: unknown; token?: string; } = {}) {
  if (!base) throw new ApiError(0, ['API URL is not configured.']);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const multipart = options.body instanceof FormData;
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let response: Response;
  try { response = await fetch(`${base}${path}`, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body), cache: 'no-store', signal: AbortSignal.timeout(100_000) }); }
  catch { throw new ApiError(0, ['Unable to connect. Please try again.']); }
  const data = await response.json().catch(() => null);
  const raw = data?.message;
  if (!response.ok) throw new ApiError(response.status, Array.isArray(raw) ? raw.map(String) : [typeof raw === 'string' ? raw : response.status === 401 ? 'Unauthorized' : response.status === 403 ? 'Forbidden' : 'Service Unavailable']);
  let header = response.headers.get('X-Dylan-Message') ?? '';
  try { header = decodeURIComponent(header); } catch { /* raw header */ }
  return { data: data as T, message: typeof raw === 'string' ? raw : header };
}
