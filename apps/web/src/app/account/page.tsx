'use client';
import { T, useI18n } from '@/components/language-provider';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { photos, money } from '@/lib/data';
import { useRooms, useWishlist } from '@/lib/live-data';
import { getCustomerAccount, registerCustomer, requestPasswordReset, resetCustomerPassword, saveCustomerProfile, signInCustomer, signInWithGoogle, linkGoogleAccount, signOutCustomer } from '@/lib/customer-auth';
import { GoogleSignIn } from '@/components/google-sign-in';
import { errorMessages } from '@/lib/api-client';
import { notify } from '@/lib/toast';
import { Photo, PageIntro, Eyebrow, Arrow } from '@/components/ui';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
export default function AccountPage() {
  const { t, locale } = useI18n();
  const { rooms } = useRooms();
  const { codes: wishlist } = useWishlist();
  const [mode, setMode] = useState<Mode>('login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [phone, setPhone] = useState(''),
    [preferences, setPreferences] = useState(''),
    [signed, setSigned] = useState(false),
    [pending, setPending] = useState(false),
    [resetToken, setResetToken] = useState(''),
    [confirmPassword, setConfirmPassword] = useState('');
  const [googleLinked, setGoogleLinked] = useState(false);
  const [hasLocalPassword, setHasLocalPassword] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');
  const formHeading = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const activeSession = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const syncSession = () => {
      const validAccount = getCustomerAccount();
      const nextSession = validAccount?.email ?? null;
      setGoogleLinked(Boolean(validAccount?.googleLinked));
      setHasLocalPassword(validAccount?.hasLocalPassword !== false);
      if (activeSession.current !== nextSession) {
        const previousSession = activeSession.current;
        activeSession.current = nextSession;
        setSigned(Boolean(validAccount));
        setPassword('');
        setLinkPassword('');
        setLinkOpen(false);
        setShowPassword(false);
        if (validAccount) {
          setName(validAccount.name);
          setEmail(validAccount.email);
          setPhone(validAccount.phone || '');
          setPreferences(validAccount.preferences || '');
        } else if (previousSession) {
          setMode('login');
          setName('');
          setPhone('');
          setPreferences('');
        }
      }
    };
    const openResetLink = () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('resetToken');
      if (!token) return;
      signOutCustomer();
      syncSession();
      setResetToken(token);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setMode('reset');
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    };
    openResetLink();
    syncSession();
    window.addEventListener('hashchange', openResetLink);
    window.addEventListener('dylan-storage', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('hashchange', openResetLink);
      window.removeEventListener('dylan-storage', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);
  useEffect(() => {
    if (focusOnChange.current) {
      formHeading.current?.focus({ preventScroll: true });
      focusOnChange.current = false;
    }
  }, [mode]);
  const changeMode = (next: Mode) => {
    if (next === mode || pending) return;
    if (mode === 'reset') setResetToken('');
    setConfirmPassword('');
    focusOnChange.current = true;
    setMode(next);
    setPassword('');
    setShowPassword(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const normalized = email.trim().toLowerCase();
    if (mode === 'reset' && password !== confirmPassword) {
      notify('error', 'Passwords do not match.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      notify('error', 'Full name is required.');
      return;
    }
    setPending(true);
    let registered = false;
    try {
      if (mode === 'forgot') {
        notify('success', await requestPasswordReset(normalized, locale));
      } else if (mode === 'reset') {
        const messages = await resetCustomerPassword(resetToken, password);
        setResetToken('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setMode('login');
        focusOnChange.current = true;
        notify('success', messages);
      } else {
        if (mode === 'register') {
          const messages = await registerCustomer(name.trim(), normalized, password);
          registered = true;
          notify('success', messages);
        }
        notify('success', await signInCustomer(normalized, password));
        setPassword('');
      }
    } catch (error) {
      if (registered) {
        setMode('login');
        setPassword('');
        focusOnChange.current = true;
      }
      notify('error', errorMessages(error));
    } finally { setPending(false); }
  };
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      notify('success', await saveCustomerProfile(name.trim(), phone, preferences));
    } catch (error) {
      notify('error', errorMessages(error));
    } finally { setPending(false); }
  };
  return <>
    <PageIntro crumb={t("MY ACCOUNT")}
      title={t("A more")}
      italic={t("personal stay.")}
      description={t("A space for your preferences, the rooms you love and the little details that make a stay yours.")}
    />
    <section className="container-site grid gap-10 pb-25 lg:grid-cols-[44%_56%]">
      <Photo src={photos.interior}
        alt={t("Luxury hotel welcome lounge")}
        className="min-h-[420px] lg:min-h-[740px]"
      />
      <div className="account-panel min-w-0 border border-line bg-paper p-7 md:p-12">
        {!signed
          ?
          <div className={`account-auth-view account-auth-${mode}`} key={mode}>
            {mode === 'register' && (
              <button type="button" disabled={pending} className="account-auth-back line-link" onClick={() => changeMode('login')}>
                <Icon name="arrow-left" size={15} /> <T>{"BACK TO SIGN IN"}</T>
              </button>
            )}
            <div className={mode === 'login' ? 'account-auth-intro text-center' : 'account-auth-intro'}>
              {mode === 'login' ? (
                <span className="account-auth-brand site-brand-stacked" role="img" aria-label="Dylan Grand Hotel" />
              ) : <Eyebrow><T>{"YOUR PERSONAL SPACE"}</T></Eyebrow>}
              <h2 ref={formHeading} tabIndex={-1} className="display account-auth-title">
                {t(mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your account.' : mode === 'reset' ? 'Choose a new password.' : 'Reset your password.')}
              </h2>
              {(mode === 'forgot' || mode === 'reset') && <span className="account-auth-rule" aria-hidden="true" />}
              <p className="body-copy account-auth-description">
                {t(mode === 'login' ? 'Sign in to manage your stay.' : mode === 'register' ? 'Make your next stay more personal.' : mode === 'reset' ? 'Choose a new password for your account.' : 'Enter your email address to request a password reset.')}
              </p>
            </div>
            <form onSubmit={submit} onInvalid={() => notify('error', 'Please check the information you entered.')} className="account-auth-form grid gap-5" aria-busy={pending}>
              {mode === 'register' && (
                <label>
                  <span className="field-label"><T>{"FULL NAME"}</T></span>
                  <input className="field-control" autoComplete="name" placeholder={t('Enter your full name')} value={name} maxLength={120} disabled={pending} required onChange={e => setName(e.target.value)} />
                </label>
              )}
              {mode !== 'reset' && <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <span className="account-auth-input">
                  {mode === 'login' && <Icon name="mail" size={18} className="account-auth-input-icon" />}
                  <input className={`field-control ${mode === 'login' ? 'account-auth-with-icon' : ''}`}
                    type="email" autoComplete="email" maxLength={180} disabled={pending} required value={email}
                    placeholder={t('Enter your email address')}
                    onChange={e => setEmail(e.target.value)} />
                </span>
              </label>}
              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="account-password" className="field-label"><T>{mode === 'reset' ? 'NEW PASSWORD' : 'PASSWORD'}</T></label>
                  <div className="account-auth-input">
                    {mode === 'login' && <Icon name="lock" size={18} className="account-auth-input-icon" />}
                    <input id="account-password" className={`field-control account-auth-password ${mode === 'login' ? 'account-auth-with-icon' : ''}`}
                      type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'login' ? undefined : 12} maxLength={128} disabled={pending} required value={password} placeholder={t('Enter your password')}
                      aria-describedby={mode === 'login' ? undefined : 'account-password-note'}
                      onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="account-auth-eye" aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                      aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                    </button>
                  </div>
                  {mode !== 'login' && <p id="account-password-note" className="account-auth-note"><T>{"Use at least 12 characters."}</T></p>}
                  {mode === 'login' && (
                    <div className="mt-3 flex justify-end">
                      <button type="button" disabled={pending} className="account-auth-link" onClick={() => changeMode('forgot')}><T>{"Forgot password?"}</T></button>
                    </div>
                  )}
                </div>
              )}
              {mode === 'reset' && <label>
                <span className="field-label"><T>{"CONFIRM PASSWORD"}</T></span>
                <input className="field-control" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} disabled={pending} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('Confirm your new password')} />
              </label>}
              <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
                {t(pending ? 'PLEASE WAIT…' : mode === 'forgot' ? 'SEND RESET LINK' : mode === 'reset' ? 'RESET PASSWORD' : mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN')} <Arrow />
              </button>
            </form>
            {(mode === 'login' || mode === 'register') && <div className="account-auth-social">
              <div className="account-auth-social-divider"><T>{"OR"}</T></div>
              <GoogleSignIn disabled={pending} onCredential={async (credential, nonce) => {
                setPending(true);
                try { notify('success', await signInWithGoogle(credential, nonce)); }
                finally { setPending(false); }
              }} />
            </div>}
            <div className={`account-auth-alternative ${(mode === 'forgot' || mode === 'reset') ? 'account-auth-alternative-back' : ''}`}>
              {(mode === 'forgot' || mode === 'reset') ? (
                <button type="button" disabled={pending} className="account-auth-back line-link" onClick={() => changeMode('login')}>
                  <Icon name="arrow-left" size={15} /> <T>{"BACK TO SIGN IN"}</T>
                </button>
              ) : (
                <p>
                  <T>{mode === 'login' ? 'New to Dylan Grand?' : 'Already have an account?'}</T>{' '}
                  <button type="button" disabled={pending} className="account-auth-link" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
                    {t(mode === 'login' ? 'Create an account' : 'Sign in')}
                  </button>
                </p>
              )}
            </div>
          </div>
          :
          <>
            <div className="flex flex-wrap justify-between gap-4">
              <Eyebrow><T>{"YOUR PRIVATE PROFILE"}</T></Eyebrow>
              <button disabled={pending} onClick={() => {
                signOutCustomer();
                setSigned(false);
                notify('success', 'Signed out.');
              }}
                className="line-link"
              ><T>{"SIGN OUT ↗"}</T></button>
            </div>
            <h2 className="display mt-6 text-6xl"><T>{"Hello,"}</T>{" "}<em>{name.split(' ')[0] || t('guest')}.</em></h2>
            <p className="body-copy mt-5"><T>{"A few thoughtful details can make every stay more personal."}</T></p>
            <form className="mt-8 grid gap-5" onSubmit={saveProfile} onInvalid={() => notify('error', 'Please check the information you entered.')} aria-busy={pending}>
              <label>
                <span className="field-label"><T>{"FULL NAME"}</T></span>
                <input className="field-control" placeholder={t('Enter your full name')} value={name} maxLength={120} disabled={pending} onChange={e => setName(e.target.value)} required />
              </label>
              <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <input className="field-control" value={email} readOnly />
              </label>
              <label>
                <span className="field-label"><T>{"PHONE"}</T></span>
                <input className="field-control" placeholder={locale === 'vi' ? 'Nhập số điện thoại' : 'Enter phone number'} value={phone} maxLength={32} disabled={pending} onChange={e => setPhone(e.target.value)} />
              </label>
              <label>
                <span className="field-label"><T>{"STAY PREFERENCES"}</T></span>
                <textarea className="field-control min-h-24"
                  placeholder={t("A quiet room, twin beds…")}
                  value={preferences}
                  maxLength={1000}
                  disabled={pending}
                  onChange={e => setPreferences(e.target.value)}
                />
              </label>
              <button className="btn-primary disabled:opacity-60" type="submit" disabled={pending}><T>{pending ? "PLEASE WAIT…" : "SAVE PROFILE"}</T>{" "}<Arrow /></button>
            </form>
            <div className="mt-8 grid gap-4 border-t border-line pt-6">
              <h3 className="font-display text-2xl">{t('Sign-in methods')}</h3>
              <p className="body-copy">{t(googleLinked ? 'Google account linked.' : 'Google account not linked.')}</p>
              {!googleLinked && !linkOpen && <button type="button" disabled={pending} className="line-link justify-self-start" onClick={() => setLinkOpen(true)}>{t('Link Google account')}</button>}
              {!googleLinked && linkOpen && <div className="grid gap-3">
                <p className="body-copy">{t('Confirm your current password and choose the Google account with the same email.')}</p>
                <label>
                  <span className="field-label">{t('Current password')}</span>
                  <input className="field-control" type="password" autoComplete="current-password" maxLength={128} value={linkPassword} disabled={pending} placeholder={t('Enter your password')} onChange={e => setLinkPassword(e.target.value)} />
                </label>
                <GoogleSignIn disabled={pending || !linkPassword} onCredential={async (credential, nonce) => {
                  setPending(true);
                  try {
                    notify('success', await linkGoogleAccount(credential, nonce, linkPassword));
                    setLinkOpen(false);
                  } finally { setLinkPassword(''); setPending(false); }
                }} />
                <button type="button" className="line-link justify-self-start" disabled={pending} onClick={() => { setLinkOpen(false); setLinkPassword(''); }}>{t('Cancel')}</button>
              </div>}
              {!hasLocalPassword && <>
                <p className="body-copy">{t('Set a password using a secure link sent to your email.')}</p>
                <button type="button" className="line-link justify-self-start" disabled={pending} onClick={async () => {
                  setPending(true);
                  try { notify('success', await requestPasswordReset(email, locale)); }
                  catch (error) { notify('error', errorMessages(error)); }
                  finally { setPending(false); }
                }}>{t('Send password setup link')}</button>
              </>}
            </div>
          </>}
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <Eyebrow><T>{"YOUR FAVOURITES"}</T></Eyebrow>
        <h2 className="section-heading mt-5"><T>{"Consider every moment,"}</T>{" "}<em><T>{"yours."}</T></em></h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {rooms.filter(r => wishlist.includes(r.id)).map(r => <Link href={`/rooms?room=${r.id}`} className="group" key={r.id}>
            <Photo src={r.images[0]} alt={t(r.name)} className="aspect-[4/3]" />
            <h3 className="font-display mt-4 text-4xl">
              {t(r.name)}
            </h3>
            <span className="text-xs text-muted">{money(r.price)} <T>{"/ night"}</T></span>
          </Link>)}
          {wishlist.length === 0 && <div className="border border-line p-9 md:col-span-3">
            <p className="body-copy"><T>{"No favourite rooms yet. Select the heart icon on any room to save it here."}</T></p>
            <Link href="/rooms" className="line-link mt-7"><T>{"DISCOVER ROOMS"}</T>{" "}<Arrow /></Link>
          </div>}
        </div>
      </div>
    </section>
  </>;
}
