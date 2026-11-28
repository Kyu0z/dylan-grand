'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/language-provider';
import { googleChallenge } from '@/lib/customer-auth';
import { errorMessages } from '@/lib/api-client';
import { notify } from '@/lib/toast';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
const callbackPath = '/account/google-callback';
const expiredMessage = 'Google sign-in expired. Please try again.';
const failedMessage = 'Google sign-in failed. Please try again.';

type Props = {
  disabled?: boolean;
  onCredential: (credential: string, nonce: string, codeVerifier: string) => Promise<void>;
};

type Attempt = {
  popup: Window;
  channel: BroadcastChannel;
  timer?: number;
  exchanging: boolean;
};

function randomHex() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function dispose(attempt: Attempt) {
  if (attempt.timer !== undefined) window.clearTimeout(attempt.timer);
  attempt.channel.close();
  try { attempt.popup.close(); } catch { /* COOP may isolate the window. */ }
}

export function GoogleSignIn({ disabled = false, onCredential }: Props) {
  const { t, locale } = useI18n();
  const latest = useRef({ disabled, onCredential });
  const current = useRef<Attempt | null>(null);
  const [working, setWorking] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => { latest.current = { disabled, onCredential }; }, [disabled, onCredential]);
  useEffect(() => () => {
    if (current.current) dispose(current.current);
    current.current = null;
  }, []);

  function finish(attempt: Attempt) {
    if (current.current !== attempt) return;
    dispose(attempt);
    current.current = null;
    setWorking(false);
    setExchanging(false);
  }

  async function start() {
    if (!clientId || disabled || current.current) return;
    if (!window.crypto?.subtle || typeof BroadcastChannel === 'undefined') {
      notify('error', 'Google sign-in is not supported in this browser.');
      return;
    }
    // Open synchronously inside the click event to avoid popup blockers.
    const popup = window.open('about:blank', '_blank', 'popup,width=520,height=680');
    if (!popup) {
      notify('error', 'Allow pop-ups to continue with Google.');
      return;
    }
    let channel: BroadcastChannel;
    let state: string;
    let verifier: string;
    try {
      popup.opener = null;
      state = randomHex();
      verifier = randomHex();
      channel = new BroadcastChannel(`dylan-google-${state}`);
    } catch {
      popup.close();
      notify('error', failedMessage);
      return;
    }
    const attempt: Attempt = { popup, channel, exchanging: false };
    current.current = attempt;
    setWorking(true);
    try {
      const [challenge, codeChallenge] = await Promise.all([googleChallenge(), pkceChallenge(verifier)]);
      if (current.current !== attempt) return;
      const expiresAt = Date.parse(challenge.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        finish(attempt);
        notify('error', expiredMessage);
        return;
      }
      channel.onmessage = async event => {
        if (current.current !== attempt || attempt.exchanging) return;
        const data = event.data;
        if (!data || data.state !== state) return;
        if (data.error) {
          finish(attempt);
          if (data.error !== 'access_denied') notify('error', failedMessage);
          return;
        }
        if (typeof data.code !== 'string' || !data.code || latest.current.disabled) {
          finish(attempt);
          return;
        }
        if (expiresAt <= Date.now()) {
          finish(attempt);
          notify('error', expiredMessage);
          return;
        }
        attempt.exchanging = true;
        setExchanging(true);
        if (attempt.timer !== undefined) window.clearTimeout(attempt.timer);
        // Authorization code and PKCE verifier are sent to the existing API.
        // The Google client secret and token exchange stay on the server.
        try {
          await latest.current.onCredential(data.code, challenge.nonce, verifier);
        } catch (error) {
          if (current.current === attempt) notify('error', errorMessages(error));
        } finally {
          finish(attempt);
        }
      };
      attempt.timer = window.setTimeout(() => {
        if (current.current !== attempt) return;
        finish(attempt);
        notify('error', expiredMessage);
      }, Math.min(expiresAt - Date.now(), 15 * 60_000));
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}${callbackPath}`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce: challenge.nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'online',
        prompt: 'select_account',
        hl: locale,
      }).toString();
      popup.location.replace(url.toString());
    } catch (error) {
      if (current.current !== attempt) return;
      finish(attempt);
      notify('error', errorMessages(error));
    }
  }

  if (!clientId) return <p className="body-copy text-center">{t('Google sign-in is not configured.')}</p>;
  return (
    <div className="grid w-full gap-2">
      <button type="button" className="account-auth-google" disabled={disabled || working} aria-busy={working} onClick={() => void start()}>
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.1z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.4l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20 20 0 0 0 24 44z" />
          <path fill="#FBBC05" d="M12.6 27.9a12 12 0 0 1 0-7.8v-5.4H5.7a20 20 0 0 0 0 18.6z" />
          <path fill="#EA4335" d="M24 11.7c3 0 5.7 1 7.8 3l5.8-5.8A19.2 19.2 0 0 0 24 4 20 20 0 0 0 5.7 14.7l6.9 5.4c1.6-4.8 6.1-8.4 11.4-8.4z" />
        </svg>
        {t(working ? 'PLEASE WAIT…' : 'Continue with Google')}
      </button>
      {working && !exchanging && <button type="button" className="line-link justify-self-center" onClick={() => { if (current.current) finish(current.current); }}>{t('Cancel')}</button>}
    </div>
  );
}
