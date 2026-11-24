'use client';
import { T, useI18n } from '@/components/language-provider';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { photos, rooms, money } from '@/lib/data';
import { getWishlist } from '@/lib/storage';
import { AuthError, getCustomerAccount, registerCustomer, requestPasswordReset, resetCustomerPassword, saveCustomerProfile, signInCustomer, signOutCustomer } from '@/lib/customer-auth';
import { Photo, PageIntro, Eyebrow, Arrow } from '@/components/ui';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
export default function AccountPage() {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<Mode>('login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [phone, setPhone] = useState(''),
    [preferences, setPreferences] = useState(''),
    [signed, setSigned] = useState(false),
    [feedback, setFeedback] = useState(''),
    [pending, setPending] = useState(false),
    [resetToken, setResetToken] = useState(''),
    [confirmPassword, setConfirmPassword] = useState(''),
    [wishlist, setWishlist] = useState<string[]>([]);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const activeSession = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const syncSession = () => {
      const validAccount = getCustomerAccount();
      const nextSession = validAccount?.email ?? null;
      if (activeSession.current !== nextSession) {
        const previousSession = activeSession.current;
        activeSession.current = nextSession;
        setSigned(Boolean(validAccount));
        setPassword('');
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
          setFeedback('Signed out.');
        }
      }
      setWishlist(getWishlist());
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
      setFeedback('');
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
    setFeedback('');
    setPassword('');
    setShowPassword(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setFeedback('');
    const normalized = email.trim().toLowerCase();
    if (mode === 'reset' && password !== confirmPassword) {
      setFeedback('Passwords do not match.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setFeedback('Full name is required.');
      return;
    }
    setPending(true);
    let registered = false;
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(normalized, locale);
        setFeedback('If an eligible account exists, a reset link will be sent.');
      } else if (mode === 'reset') {
        await resetCustomerPassword(resetToken, password);
        setResetToken('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setMode('login');
        focusOnChange.current = true;
        setFeedback('Password updated. Please sign in.');
      } else {
        if (mode === 'register') {
          await registerCustomer(name.trim(), normalized, password);
          registered = true;
        }
        await signInCustomer(normalized, password);
        setPassword('');
      }
    } catch (error) {
      if (registered) {
        setMode('login');
        setPassword('');
        setFeedback('Account created. Please sign in.');
      } else if (mode === 'reset' && error instanceof AuthError && error.status === 400) {
        setFeedback('Reset link is invalid or expired.');
      } else {
        setFeedback(error instanceof AuthError ? error.message : 'Something went wrong. Please try again.');
      }
    } finally { setPending(false); }
  };
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setFeedback('');
    setPending(true);
    try {
      await saveCustomerProfile(name.trim(), phone, preferences);
      setFeedback('Profile saved. Stay preferences are saved on this device.');
    } catch (error) {
      setFeedback(error instanceof AuthError ? error.message : 'Something went wrong. Please try again.');
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
            <form onSubmit={submit} className="account-auth-form grid gap-5" aria-busy={pending}>
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
            {mode === 'login' && <div className="account-auth-social">
              <div className="account-auth-social-divider"><T>{"OR"}</T></div>
              <button type="button" className="account-auth-google" disabled={pending} onClick={() => setFeedback('Google sign-in is not available yet.')}>
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.1z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.4l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20 20 0 0 0 24 44z" />
                  <path fill="#FBBC05" d="M12.6 27.9a12 12 0 0 1 0-7.8v-5.4H5.7a20 20 0 0 0 0 18.6z" />
                  <path fill="#EA4335" d="M24 11.7c3 0 5.7 1 7.8 3l5.8-5.8A19.2 19.2 0 0 0 24 4 20 20 0 0 0 5.7 14.7l6.9 5.4c1.6-4.8 6.1-8.4 11.4-8.4z" />
                </svg><T>{"Continue with Google"}</T>
              </button>
            </div>}
            {feedback && <p role="status" className="mt-4 text-sm leading-6 text-muted">{t(feedback)}</p>}
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
              <button onClick={() => {
                signOutCustomer();
                setSigned(false);
                setFeedback('Signed out.');
              }}
                className="line-link"
              ><T>{"SIGN OUT ↗"}</T></button>
            </div>
            <h2 className="display mt-6 text-6xl"><T>{"Hello,"}</T>{ " " }<em>{name.split(' ')[0] || t('guest')}.</em></h2>
            <p className="body-copy mt-5"><T>{"A few thoughtful details can make every stay more personal."}</T></p>
            <form className="mt-8 grid gap-5" onSubmit={saveProfile} aria-busy={pending}>
              <label>
                <span className="field-label"><T>{"FULL NAME"}</T></span>
                <input className="field-control" value={name} maxLength={120} disabled={pending} onChange={e => setName(e.target.value)} required />
              </label>
              <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <input className="field-control" value={email} readOnly />
              </label>
              <label>
                <span className="field-label"><T>{"PHONE"}</T></span>
                <input className="field-control" value={phone} maxLength={32} disabled={pending} onChange={e => setPhone(e.target.value)} />
              </label>
              <label>
                <span className="field-label"><T>{"STAY PREFERENCES"}</T></span>
                <textarea className="field-control min-h-24"
                  placeholder={t("A quiet room, twin beds…")}
                  value={preferences}
                  disabled={pending}
                  onChange={e => setPreferences(e.target.value)}
                />
              </label>
              <button className="btn-primary disabled:opacity-60" type="submit" disabled={pending}><T>{pending ? "PLEASE WAIT…" : "SAVE PROFILE"}</T>{ " " }<Arrow /></button>
            </form>
            {feedback && <p role="status" className="mt-5 text-xs text-muted">
              {t(feedback)}
            </p>}
          </>}
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <Eyebrow><T>{"YOUR FAVOURITES"}</T></Eyebrow>
        <h2 className="section-heading mt-5"><T>{"Consider every moment,"}</T>{ " " }<em><T>{"yours."}</T></em></h2>
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
            <Link href="/rooms" className="line-link mt-7"><T>{"DISCOVER ROOMS"}</T>{ " " }<Arrow /></Link>
          </div>}
        </div>
      </div>
    </section>
  </>;
}
