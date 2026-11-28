'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/language-provider';
import { googleChallenge } from '@/lib/customer-auth';
import { errorMessages } from '@/lib/api-client';
import { notify } from '@/lib/toast';

type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    ux_mode: 'popup';
    auto_select: boolean;
    callback: (response: { credential?: string }) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: {
    type: 'standard'; theme: 'outline' | 'filled_black'; size: 'large';
    text: 'continue_with'; shape: 'rectangular'; width: number; locale: string;
  }) => void;
};

function identity() {
  return (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
}

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

type Props = {
  disabled?: boolean;
  onCredential: (credential: string, nonce: string) => Promise<void>;
};

export function GoogleSignIn({ disabled = false, onCredential }: Props) {
  const { locale, t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ disabled, onCredential });
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [challenge, setChallenge] = useState<{ nonce: string; expiresAt: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const [working, setWorking] = useState(false);
  const [night, setNight] = useState(false);
  const [width, setWidth] = useState(0);
  useEffect(() => { latest.current = { disabled, onCredential }; }, [disabled, onCredential]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => setWidth(Math.min(400, Math.floor(node.clientWidth)));
    const updateTheme = () => setNight(document.documentElement.dataset.theme === 'night');
    measure();
    updateTheme();
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    const theme = new MutationObserver(updateTheme);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { resize.disconnect(); theme.disconnect(); };
  }, []);

  useEffect(() => {
    if (!clientId || !ready) return;
    let active = true;
    setChallenge(null);
    setError(false);
    void googleChallenge().then(value => {
      if (active) setChallenge(value);
    }).catch(err => {
      if (active) { setError(true); notify('error', errorMessages(err)); }
    });
    return () => { active = false; };
  }, [ready, retry]);

  useEffect(() => {
    if (!clientId || !challenge) return;
    const google = identity();
    if (!google) return;
    let active = true;
    google.initialize({
      client_id: clientId,
      nonce: challenge.nonce,
      ux_mode: 'popup',
      auto_select: false,
      callback: async response => {
        if (!active || busy.current || latest.current.disabled || !response.credential) return;
        busy.current = true;
        setWorking(true);
        try {
          if (Date.parse(challenge.expiresAt) <= Date.now()) throw new Error('expired');
          await latest.current.onCredential(response.credential, challenge.nonce);
        } catch (err) {
          if (active) notify('error', err instanceof Error && err.message === 'expired'
            ? 'Google sign-in expired. Please try again.' : errorMessages(err));
        } finally {
          busy.current = false;
          if (active) { setWorking(false); setChallenge(null); setRetry(value => value + 1); }
        }
      },
    });
    return () => { active = false; };
  }, [challenge]);

  useEffect(() => {
    const node = host.current;
    const google = identity();
    if (!node || !google || !challenge || width < 100) return;
    node.replaceChildren();
    google.renderButton(node, {
      type: 'standard', theme: night ? 'filled_black' : 'outline',
      size: 'large', text: 'continue_with', shape: 'rectangular', width, locale
    });
    return () => { node.replaceChildren(); };
  }, [challenge, width, night, locale]);

  if (!clientId) return <p className="body-copy text-center">{t('Google sign-in is not configured.')}</p>;
  return <div className="grid justify-items-center gap-2">
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive"
      onReady={() => setReady(true)} onError={() => { setError(true); notify('error', 'Google sign-in failed to load. Please refresh the page.'); }} />
    <div ref={host} className={`flex w-full min-w-0 justify-center ${disabled || working ? 'opacity-60' : ''}`} style={{ minHeight: 40 }}
      inert={disabled || working || !challenge} aria-busy={working || (!challenge && !error)} />
    {working && <p className="body-copy">{t('PLEASE WAIT…')}</p>}
    {!challenge && !error && !working && <p className="body-copy">{t('Loading Google sign-in…')}</p>}
    {error && <button type="button" className="line-link" onClick={() => {
      if (!ready) window.location.reload();
      else setRetry(value => value + 1);
    }}>{t('Retry Google sign-in')}</button>}
  </div>;
}
