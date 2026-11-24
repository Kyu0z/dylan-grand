import { read, write } from './storage';
import { apiRequest, ApiError } from './api-client';
import { notify } from './toast';
export { ApiError as AuthError } from './api-client';

export type CustomerProfile = { id: string; email: string; fullName: string; phone: string };
export type Account = { name: string; email: string; phone: string; preferences: string };
type Session = { accessToken: string; expiresAt: number; profile: CustomerProfile };
type LoginResponse = { accessToken: string; expiresIn: number; role: string };
const sessionKey = 'dylan-grand-customer-session-v1';
// Auth is a multi-step flow; the UI emits one result per completed action.
function request<T>(path: string, method = 'GET', body?: object, token?: string) {
  return apiRequest<T>(path, { method, body, token, notifications: 'none' });
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
  const { data: login, messages } = await request<LoginResponse>('/auth/login', 'POST', { email, password });
  if (login.role !== 'CUSTOMER') throw new ApiError(403, 'Please sign in with a customer account.');
  const expiresAt = Date.now() + login.expiresIn * 1000;
  const { data: profile } = await request<CustomerProfile>('/me', 'GET', undefined, login.accessToken);
  setSession({ accessToken: login.accessToken, expiresAt, profile });
  return messages;
}
export async function registerCustomer(fullName: string, email: string, password: string) {
  return (await request('/auth/register', 'POST', { fullName, email, password })).messages;
}
export async function requestPasswordReset(email: string, locale: 'en' | 'vi') {
  return (await request('/auth/forgot-password', 'POST', { email, locale })).messages;
}
export async function resetCustomerPassword(token: string, password: string) {
  return (await request('/auth/reset-password', 'POST', { token, password })).messages;
}
export async function refreshCustomerSession() {
  const session = getSession();
  if (!session) return;
  try {
    const { data: profile } = await request<CustomerProfile>('/me', 'GET', undefined, session.accessToken);
    if (getSession()?.accessToken === session.accessToken) setSession({ ...session, profile });
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status) && getSession()?.accessToken === session.accessToken) {
      signOutCustomer();
      notify('error', error.messages);
    }
    // Transient connection failures do not destroy a valid local session.
  }
}
export async function saveCustomerProfile(fullName: string, phone: string, preferences: string) {
  const session = getSession();
  if (!session) throw new ApiError(401, 'Your session has expired. Please sign in.');
  try {
    const { data: profile, messages } = await request<CustomerProfile>('/me', 'PATCH', { fullName, phone }, session.accessToken);
    if (getSession()?.accessToken !== session.accessToken) throw new ApiError(401, 'Your session has expired. Please sign in.');
    setSession({ ...session, profile });
    write(`preferences-${profile.id}`, preferences);
    return messages;
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status) && getSession()?.accessToken === session.accessToken) {
      signOutCustomer();
    }
    throw error;
  }
}
