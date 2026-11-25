import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale } from './locale';
import { L } from './domain';
import { translateApiMessage } from './api-messages';
import { ApiError, request } from './api-client';
import { roles, type StaffAccount, type StaffRole } from './staff-access';
export { roles, roleNames, manageableRoles, canAccess, type StaffRole, type StaffAccount } from './staff-access';

const key = 'dgh-admin-access-token';
const initialToken = () => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } };
const base = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '')).replace(/\/+$/, '');

type Toast = { id: number; messages: string[]; error: boolean };
type Options = { method?: string; body?: unknown; auth?: boolean; silentSuccess?: boolean; silentError?: boolean; onSuccessMessage?: (message: string) => void };
type Context = { user: StaffAccount | null; loading: boolean; sessionError: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; clear: () => void; refresh: () => Promise<void>; api: <T>(path: string, options?: Options) => Promise<T>; notify: (messages: string | string[], error?: boolean) => void };
const AuthContext = createContext<Context | null>(null);
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLocale();
  const token = useRef(initialToken());
  const [user, setUser] = useState<StaffAccount | null>(null);
  const [loading, setLoading] = useState(!!token.current);
  const [sessionError, setSessionError] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const notify = useCallback((messages: string | string[], error = false) => {
    const id = ++next.current;
    const list = Array.isArray(messages) ? messages : [messages];
    setToasts(old => [...old.slice(-4), { id, messages: list, error }]);
    window.setTimeout(() => setToasts(old => old.filter(x => x.id !== id)), error ? 8500 : 5000);
  }, []);
  const clear = useCallback(() => { token.current = ''; try { sessionStorage.removeItem(key); } catch { /* no storage */ } setUser(null); setSessionError(false); setLoading(false); }, []);
  const api = useCallback(async <T,>(path: string, options: Options = {}) => {
    const used = options.auth === false ? undefined : token.current;
    try {
      const result = await request<T>(base, path, { ...options, token: used });
      options.onSuccessMessage?.(result.message);
      if (!options.silentSuccess && (options.method ?? 'GET') !== 'GET' && result.message) notify(result.message, (result.data as { invitationSent?: boolean } | null)?.invitationSent === false);
      return result.data;
    } catch (error) {
      const e = error instanceof ApiError ? error : new ApiError(0, ['Unable to connect. Please try again.']);
      if (e.status === 401 && used && used === token.current) clear();
      if (!options.silentError) notify(e.messages, true);
      throw e;
    }
  }, [clear, notify]);
  const refresh = useCallback(async () => {
    if (!token.current) { setLoading(false); return; }
    const current = token.current;
    try { const result = await api<StaffAccount>('/auth/staff/me', { silentError: true }); if (token.current === current) { setUser(result); setSessionError(false); } }
    catch (e) { if (token.current === current) { if (e instanceof ApiError && [401, 403].includes(e.status)) clear(); else setSessionError(true); } }
    finally { setLoading(false); }
  }, [api, clear]);
  useEffect(() => { void refresh(); const interval = window.setInterval(() => { void refresh(); }, 60_000); return () => clearInterval(interval); }, [refresh]);
  const login = async (email: string, password: string) => {
    let loginMessage = '';
    const result = await api<{ accessToken: string; role: StaffRole }>('/auth/staff/login', { method: 'POST', body: { email, password }, auth: false, silentSuccess: true, onSuccessMessage: message => { loginMessage = message; } });
    if (!roles.includes(result.role)) { notify('Access denied.', true); throw new ApiError(403, ['Access denied.']); }
    token.current = result.accessToken;
    try { sessionStorage.setItem(key, result.accessToken); } catch { /* no storage */ }
    try { const profile = await api<StaffAccount>('/auth/staff/me'); setUser(profile); if (loginMessage) notify(loginMessage); } catch (e) { clear(); throw e; }
  };
  const logout = async () => { try { await api('/auth/staff/logout', { method: 'POST' }); } finally { clear(); } };
  return <AuthContext.Provider value={{ user, loading, sessionError, login, logout, clear, refresh, api, notify }}>
    {children}
    <div className="admin-toast-stack" aria-label={t(L('Notifications', 'Thông báo'))}>{toasts.map(item => <div key={item.id} className={`admin-toast ${item.error ? 'error' : 'success'}`} role={item.error ? 'alert' : 'status'}><div><strong>{t(item.error ? L('Attention', 'Thông báo lỗi') : L('Success', 'Thành công'))}</strong>{item.messages.map((message, i) => <div key={i}>{translateApiMessage(message, language, x => x)}</div>)}</div><button type="button" aria-label={t(L('Close notification', 'Đóng thông báo'))} onClick={() => setToasts(old => old.filter(x => x.id !== item.id))}>×</button></div>)}</div>
  </AuthContext.Provider>;
}
export function useAdminAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('AdminAuthProvider required'); return ctx; }
