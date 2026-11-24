'use client';
import { T, useI18n } from '@/components/language-provider';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { photos, rooms, money } from '@/lib/data';
import { getAccount, getCurrentUser, getWishlist, write, type Account } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, Arrow } from '@/components/ui';
type Mode = 'login' | 'register' | 'forgot';
export default function AccountPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [phone, setPhone] = useState(''),
    [preferences, setPreferences] = useState(''),
    [signed, setSigned] = useState(false),
    [feedback, setFeedback] = useState(''),
    [wishlist, setWishlist] = useState<string[]>([]);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const activeSession = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const syncSession = () => {
      const account = getAccount();
      const active = getCurrentUser();
      const validAccount = active && account?.email === active ? account : null;
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
          setFeedback('Signed out.');
        }
      }
      setWishlist(getWishlist());
    };
    syncSession();
    window.addEventListener('dylan-storage', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
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
    if (next === mode) return;
    focusOnChange.current = true;
    setMode(next);
    setFeedback('');
    setPassword('');
    setShowPassword(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback('');
    const normalized = email.trim().toLowerCase();
    const account = getAccount();
    if (mode === 'forgot') {
      setFeedback('Password reset is not connected. No email has been sent.');
      return;
    }
    if (mode === 'register') {
      if (account?.email === normalized) {
        setFeedback('This email already has a local profile. Please sign in.');
        return;
      }
      const next: Account = { name: name.trim(), email: normalized, phone, preferences };
      write('account', next);
      write('current-user', normalized);
      setSigned(true);
      setFeedback('');
      return;
    }
    if (!account || account.email !== normalized) {
      setFeedback('No local profile found. Create an account first.');
      return;
    }
    setName(account.name);
    setEmail(account.email);
    setPhone(account.phone || '');
    setPreferences(account.preferences || '');
    write('current-user', normalized);
    setSigned(true);
    setFeedback('');
  };
  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    const account = getAccount();
    if (!account) return;
    write('account', { ...account, name, phone, preferences });
    setFeedback('Profile preferences saved on this device.');
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
              <button type="button" className="account-auth-back line-link" onClick={() => changeMode('login')}>
                <Icon name="arrow-left" size={15} /> <T>{"BACK TO SIGN IN"}</T>
              </button>
            )}
            <div className={mode === 'login' ? 'account-auth-intro text-center' : 'account-auth-intro'}>
              {mode === 'login' ? (
                <span className="account-auth-brand site-brand-stacked" role="img" aria-label="Dylan Grand Hotel" />
              ) : <Eyebrow><T>{"YOUR PERSONAL SPACE"}</T></Eyebrow>}
              <h2 ref={formHeading} tabIndex={-1} className="display account-auth-title">
                {t(mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your account.' : 'Reset your password.')}
              </h2>
              {mode === 'forgot' && <span className="account-auth-rule" aria-hidden="true" />}
              <p className="body-copy account-auth-description">
                {t(mode === 'login' ? 'Sign in to manage your stay.' : mode === 'register' ? 'Make your next stay more personal.' : 'Enter your email address to request a password reset.')}
              </p>
            </div>
            <form onSubmit={submit} className="account-auth-form grid gap-5">
              {mode === 'register' && (
                <label>
                  <span className="field-label"><T>{"FULL NAME"}</T></span>
                  <input className="field-control" autoComplete="name" placeholder={t('Enter your full name')} value={name} required onChange={e => setName(e.target.value)} />
                </label>
              )}
              <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <span className="account-auth-input">
                  {mode === 'login' && <Icon name="mail" size={18} className="account-auth-input-icon" />}
                  <input className={`field-control ${mode === 'login' ? 'account-auth-with-icon' : ''}`}
                    type="email" autoComplete="email" required value={email}
                    placeholder={t('Enter your email address')}
                    onChange={e => setEmail(e.target.value)} />
                </span>
              </label>
              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="account-password" className="field-label"><T>{"PASSWORD"}</T></label>
                  <div className="account-auth-input">
                    {mode === 'login' && <Icon name="lock" size={18} className="account-auth-input-icon" />}
                    <input id="account-password" className={`field-control account-auth-password ${mode === 'login' ? 'account-auth-with-icon' : ''}`}
                      type={showPassword ? 'text' : 'password'} autoComplete="off"
                      minLength={6} required value={password} placeholder={t('Enter a test password')}
                      aria-describedby="account-password-note"
                      onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="account-auth-eye" aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                      aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                    </button>
                  </div>
                  <p id="account-password-note" className="account-auth-note"><T>{"Use a test password only; authentication is not connected."}</T></p>
                  {mode === 'login' && (
                    <div className="mt-3 flex justify-end">
                      <button type="button" className="account-auth-link" onClick={() => changeMode('forgot')}><T>{"Forgot password?"}</T></button>
                    </div>
                  )}
                </div>
              )}
              {mode === 'forgot' && <p className="account-auth-note"><T>{"Reset emails are not available yet."}</T></p>}
              <button type="submit" className="btn-primary w-full">
                {t(mode === 'forgot' ? 'SEND RESET LINK' : mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN')} <Arrow />
              </button>
            </form>
            {feedback && <p role="status" className="mt-4 text-sm leading-6 text-muted">{t(feedback)}</p>}
            <div className={`account-auth-alternative ${mode === 'forgot' ? 'account-auth-alternative-back' : ''}`}>
              {mode === 'forgot' ? (
                <button type="button" className="account-auth-back line-link" onClick={() => changeMode('login')}>
                  <Icon name="arrow-left" size={15} /> <T>{"BACK TO SIGN IN"}</T>
                </button>
              ) : (
                <p>
                  <T>{mode === 'login' ? 'New to Dylan Grand?' : 'Already have an account?'}</T>{' '}
                  <button type="button" className="account-auth-link" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
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
                write('current-user', null);
                setSigned(false);
                setFeedback('Signed out.');
              }}
                className="line-link"
              ><T>{"SIGN OUT ↗"}</T></button>
            </div>
            <h2 className="display mt-6 text-6xl"><T>{"Hello,"}</T>{ " " }<em>{name.split(' ')[0] || 'guest'}.</em></h2>
            <p className="body-copy mt-5"><T>{"A few thoughtful details can make every stay more personal."}</T></p>
            <form className="mt-8 grid gap-5" onSubmit={saveProfile}>
              <label>
                <span className="field-label"><T>{"FULL NAME"}</T></span>
                <input className="field-control" value={name} onChange={e => setName(e.target.value)} required />
              </label>
              <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <input className="field-control" value={email} readOnly />
              </label>
              <label>
                <span className="field-label"><T>{"PHONE"}</T></span>
                <input className="field-control" value={phone} onChange={e => setPhone(e.target.value)} />
              </label>
              <label>
                <span className="field-label"><T>{"STAY PREFERENCES"}</T></span>
                <textarea className="field-control min-h-24"
                  placeholder={t("A quiet room, twin beds…")}
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                />
              </label>
              <button className="btn-primary" type="submit"><T>{"SAVE PROFILE"}</T>{ " " }<Arrow /></button>
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
