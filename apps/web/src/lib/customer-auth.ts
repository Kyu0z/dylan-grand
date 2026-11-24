import { read, write } from './storage';

export type CustomerProfile = { id: string; email: string; fullName: string; phone: string };
export type Account = { name: string; email: string; phone: string; preferences: string };
type Session = { accessToken: string; expiresAt: number; profile: CustomerProfile };
type LoginResponse = { accessToken: string; expiresIn: number; role: string };
const sessionKey = 'dylan-grand-customer-session-v1';
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
async function request<T>(path: string, method = 'GET', body?: object, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20_000),
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new AuthError(0, 'Unable to connect. Please try again.'); }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Please check the information you entered.', 401: 'Invalid email or password.',
      403: 'Please sign in with a customer account.', 409: 'Email already registered.',
      429: 'Too many requests. Please try again later.', 503: 'Password reset is temporarily unavailable.',
    };
    throw new AuthError(response.status, messages[response.status] || 'Something went wrong. Please try again.');
  }
  return response.json() as Promise<T>;
}
function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(sessionKey);
    const value = raw ? JSON.parse(raw) as Session : null;
    if (!value || !value.accessToken || !value.profile?.id || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) return null;
    return value;
  } catch { return null; }
}
function setSession(session: Session) {
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  window.dispatchEvent(new Event('dylan-storage'));
}
export function signOutCustomer() {
  sessionStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event('dylan-storage'));
}
export function getCustomerAccount(): Account | null {
  const session = getSession();
  if (!session) return null;
  const { profile } = session;
  return { name: profile.fullName, email: profile.email, phone: profile.phone,
    preferences: read<string>(`preferences-${profile.id}`, '') };
}
export async function signInCustomer(email: string, password: string) {
  const login = await request<LoginResponse>('/auth/login', 'POST', { email, password });
  if (login.role !== 'CUSTOMER') throw new AuthError(403, 'Please sign in with a customer account.');
  const expiresAt = Date.now() + login.expiresIn * 1000;
  const profile = await request<CustomerProfile>('/me', 'GET', undefined, login.accessToken);
  setSession({ accessToken: login.accessToken, expiresAt, profile });
}
export async function registerCustomer(fullName: string, email: string, password: string) {
  await request('/auth/register', 'POST', { fullName, email, password });
}
export async function requestPasswordReset(email: string, locale: 'en' | 'vi') {
  await request('/auth/forgot-password', 'POST', { email, locale });
}
export async function resetCustomerPassword(token: string, password: string) {
  await request('/auth/reset-password', 'POST', { token, password });
}
export async function refreshCustomerSession() {
  const session = getSession();
  if (!session) return;
  try {
    const profile = await request<CustomerProfile>('/me', 'GET', undefined, session.accessToken);
    if (getSession()?.accessToken === session.accessToken) setSession({ ...session, profile });
  } catch (error) {
    if (error instanceof AuthError && [401, 403].includes(error.status) && getSession()?.accessToken === session.accessToken) signOutCustomer();
    // Transient connection failures do not destroy a valid local session.
  }
}
export async function saveCustomerProfile(fullName: string, phone: string, preferences: string) {
  const session = getSession();
  if (!session) throw new AuthError(401, 'Your session has expired. Please sign in.');
  try {
    const profile = await request<CustomerProfile>('/me', 'PATCH', { fullName, phone }, session.accessToken);
    if (getSession()?.accessToken !== session.accessToken) throw new AuthError(401, 'Your session has expired. Please sign in.');
    setSession({ ...session, profile });
    write(`preferences-${profile.id}`, preferences);
  } catch (error) {
    if (error instanceof AuthError && [401, 403].includes(error.status)) {
      if (getSession()?.accessToken === session.accessToken) signOutCustomer();
      throw new AuthError(401, 'Your session has expired. Please sign in.');
    }
    throw error;
  }
}
