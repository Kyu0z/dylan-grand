export type ToastKind = 'success' | 'error' | 'info';
export type ToastMessage = { kind: ToastKind; messages: string[] };
export const TOAST_EVENT = 'dylan-toast';

export function notify(kind: ToastKind, message: string | string[]) {
  const messages = (Array.isArray(message) ? message : [message]).filter(Boolean);
  if (typeof window !== 'undefined' && messages.length) {
    window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { kind, messages } }));
  }
}
