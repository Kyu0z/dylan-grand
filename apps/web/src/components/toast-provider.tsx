'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from './language-provider';
import { Icon } from './icons';
import { TOAST_EVENT, type ToastMessage } from '@/lib/toast';
import { translateApiMessage } from '@/lib/api-messages';

type Toast = ToastMessage & { id: number };
const titles = { success: 'Success', error: 'Error', info: 'Information' } as const;
const duration = { success: 5000, error: 8500, info: 6000 };

function ToastCard({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const { locale, t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(duration[toast.kind]);
  useEffect(() => {
    if (hovered || focused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss(toast.id), remaining.current);
    return () => { window.clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [hovered, focused, toast.id, dismiss]);
  return <div className={`dylan-toast dylan-toast--${toast.kind}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <span className="dylan-toast-symbol" aria-hidden="true">{toast.kind === 'success' ? <Icon name="check" size={17} /> : toast.kind === 'error' ? '!' : 'i'}</span>
    <div className="dylan-toast-copy" role={toast.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      <strong>{translateApiMessage(titles[toast.kind], locale, t)}</strong>
      {toast.messages.map((message, index) => <p key={index}>{translateApiMessage(message, locale, t)}</p>)}
    </div>
    <button type="button" className="dylan-toast-close" aria-label={translateApiMessage('Dismiss notification', locale, t)} onClick={() => dismiss(toast.id)}><Icon name="close" size={16} /></button>
  </div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const recent = useRef<{ key: string; at: number } | null>(null);
  // A stable callback prevents existing toast timers from restarting on new notifications.
  const dismissRef = useRef((id: number) => setToasts(current => current.filter(toast => toast.id !== id)));
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastMessage>).detail;
      if (!detail?.messages?.length || !(detail.kind in titles)) return;
      const key = JSON.stringify(detail);
      const now = Date.now();
      if (recent.current?.key === key && now - recent.current.at < 600) return;
      recent.current = { key, at: now };
      const toast = { ...detail, id: ++counter.current };
      setToasts(current => [...current, toast].slice(-5));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);
  return <>{children}<div className="dylan-toast-viewport">{toasts.map(toast => <ToastCard key={toast.id} toast={toast} dismiss={dismissRef.current} />)}</div></>;
}
