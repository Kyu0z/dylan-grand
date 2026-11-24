'use client';
import { T, useI18n } from '@/components/language-provider';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { photos, rooms, money } from '@/lib/data';
import { getAccount, getCurrentUser, getWishlist, write, type Account } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, InfoNote, Arrow } from '@/components/ui';
type Mode = 'login' | 'register' | 'forgot';
export default function AccountPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [phone, setPhone] = useState(''),
    [preferences, setPreferences] = useState(''),
    [signed, setSigned] = useState(false),
    [feedback, setFeedback] = useState(''),
    [wishlist, setWishlist] = useState<string[]>([]);
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
        setFeedback('A demo profile with this email already exists in this browser.');
        return;
      }
      const next: Account = { name: name.trim(), email: normalized, phone, preferences };
      write('account', next);
      write('current-user', normalized);
      setSigned(true);
      setFeedback('Demo profile created locally. No real account was registered.');
      return;
    }
    if (!account || account.email !== normalized) {
      setFeedback('No matching browser-only demo profile. Create one first.');
      return;
    }
    setName(account.name);
    setEmail(account.email);
    setPhone(account.phone || '');
    setPreferences(account.preferences || '');
    write('current-user', normalized);
    setSigned(true);
    setFeedback('Signed in to browser-only demo.');
  };
  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    const account = getAccount();
    if (!account) return;
    write('account', { ...account, name, phone, preferences });
    setFeedback('Your profile preferences were saved in this browser.');
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
      <div className="border border-line bg-paper p-7 md:p-12">
        {!signed
          ?
          <>
            <Eyebrow><T>{"YOUR PERSONAL SPACE"}</T></Eyebrow>
            <h2 className="display mt-7 text-6xl">
              {t(mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Join the story.' : 'A fresh start.')}
            </h2>
            <p className="body-copy mt-5">
              {mode === 'forgot'
                ?
                t('This is a visual-only flow. No reset email can be delivered.')
                :
                t('Create or open a local demo profile. Password input is visual only; do not use a real password.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {(['login', 'register', 'forgot'] as Mode[]).map(x => <button onClick={() => {
                setMode(x);
                setFeedback('');
              }}
                key={x}
                className={`pill ${mode === x ? 'border-gold bg-surface-alt' : ''}`}
              >
                {t(x === 'forgot' ? 'RESET' : x.toUpperCase())}
              </button>)}
            </div>
            <form onSubmit={submit} className="mt-8 grid gap-5">
              {mode === 'register' && <label>
                <span className="field-label"><T>{"FULL NAME"}</T></span>
                <input className="field-control" value={name} required onChange={e => setName(e.target.value)} />
              </label>}
              <label>
                <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
                <input className="field-control"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
              {mode !== 'forgot' && <label>
                <span className="field-label"><T>{"DEMO PASSWORD (NOT VERIFIED OR STORED)"}</T></span>
                <input className="field-control"
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </label>}
              <button type="submit" className="btn-primary">{t(mode === 'forgot' ? 'REQUEST DEMO RESET' : mode === 'register' ? 'CREATE DEMO ACCOUNT' : 'SIGN IN')} <Arrow /></button>
            </form>
            {feedback && <p role="status" className="mt-5 text-xs leading-6 text-muted">
              {t(feedback)}
            </p>}
          </>
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
                <span className="field-label"><T>{"EMAIL (DEMO ID)"}</T></span>
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
    <div className="container-site py-10">
      <InfoNote><T>{"Local demo only: passwords entered here are not stored or verified. This page does not authenticate a real user. Never enter real credentials; production requires a secure backend identity provider."}</T></InfoNote>
    </div>
  </>;
}
