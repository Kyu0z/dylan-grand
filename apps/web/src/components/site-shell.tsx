'use client';
import { T, useI18n } from '@/components/language-provider';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { notify } from '@/lib/toast';
import { getCustomerAccount, refreshCustomerSession, signOutCustomer, type Account } from '@/lib/customer-auth';
const links = [
  ['/', 'THE HOTEL'],
  ['/rooms', 'ROOMS & SUITES'],
  ['/availability', 'AVAILABILITY'],
  ['/experiences', 'EXPERIENCES']
];
export default function SiteShell({ children }: { children: ReactNode; }) {
  const { t, locale, setLocale } = useI18n();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncAccount = () => {
      const profile = getCustomerAccount();
      setAccount(profile);
      if (!profile) setProfileOpen(false);
    };
    const refresh = () => { syncAccount(); void refreshCustomerSession(); };
    refresh();
    const timer = window.setInterval(() => {
      syncAccount();
      window.dispatchEvent(new Event('dylan-storage'));
    }, 15_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('dylan-storage', syncAccount);
    window.addEventListener('storage', syncAccount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('dylan-storage', syncAccount);
      window.removeEventListener('storage', syncAccount);
    };
  }, []);

  useEffect(() => {
    setMenu(false);
    setProfileOpen(false);
  }, [path]);

  useEffect(() => {
    if (!profileOpen && !menu) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
      if (!mobileNavRef.current?.contains(target) && !mobileButtonRef.current?.contains(target)) {
        setMenu(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (profileOpen) {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      } else if (menu) {
        setMenu(false);
        mobileButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [profileOpen, menu]);

  const signOut = () => {
    signOutCustomer();
    notify('success', 'Signed out.');
    setProfileOpen(false);
    setMenu(false);
  };
  const profileName = account?.name.trim() || account?.email || '';
  const initials = profileName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => Array.from(part)[0]).join('').toUpperCase();

  const [scroll, setScroll] = useState(0);
  const [theme, setTheme] = useState<'light' | 'night'>('light');
  useEffect(() => {
    const old = localStorage.getItem('dylan-theme');
    if (old === 'night') setTheme('night');
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('dylan-theme', theme);
  }, [theme]);
  useEffect(() => {
    const handler = () => setScroll(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('main > section:not(:first-child), main > div > section.section-pad')];
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    for (const el of elements) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('scroll-reveal');
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, [path]);
  return <>
    <div className="border-b border-forest/10 bg-forest py-2 text-center text-[9px] font-medium tracking-[.22em] text-surface uppercase"><T>{"AN INTIMATE ESCAPE · INSPIRED BY THE ART OF SLOW LIVING"}</T></div>
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="absolute left-0 top-0 h-[2px] bg-gold transition-[width]"
        style={{ width: `${scroll * 100}%` }}
      />
      <div className="container-site site-header-row flex h-[74px] items-center justify-between gap-2 sm:h-[88px] sm:gap-4">
        <Link href="/" className="site-brand-link" aria-label="Dylan Grand Hotel — Home">
          <span className="site-brand-horizontal" aria-hidden="true" />
        </Link>
        <nav aria-label={t("Main navigation")} className="site-header-public-nav hidden items-center xl:flex">
          {links.map(([href, label]) => <Link key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
            className={`whitespace-nowrap text-[10px] font-semibold tracking-[.08em] transition-colors hover:text-gold ${path === href ? 'text-gold' : 'text-ink'}`}
          >
            {t(label)}
          </Link>)}
        </nav>
        <div className="site-header-utilities flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div
            className="flex items-center border border-line bg-paper/60 p-0.5"
            role="group"
            aria-label={locale === 'vi' ? 'Chọn ngôn ngữ' : 'Select language'}
          >
            {(['en', 'vi'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                aria-pressed={locale === option}
                lang={option}
                className={`language-option ${locale === option ? 'language-option-active' : ''}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setTheme(v => v === 'light' ? 'night' : 'light')}
            aria-label={t("Toggle color theme")}
            title={t("Toggle theme")}
            className="hidden h-10 w-10 place-items-center border border-line text-lg sm:grid"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          </button>
          <div className="site-header-account hidden xl:block">
            {account ? (
              <div
                className="site-profile"
                ref={profileRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setProfileOpen(false);
                  }
                }}
              >
                <button
                  ref={profileButtonRef}
                  type="button"
                  className="site-profile-trigger"
                  aria-expanded={profileOpen}
                  aria-controls={profileOpen ? 'site-profile-menu' : undefined}
                  aria-label={t('Account menu')}
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <span className="site-profile-avatar" aria-hidden="true">{initials}</span>
                  <span className="site-profile-name" title={profileName}>{profileName}</span>
                  <Icon name="chevron-down" size={15} className="site-profile-chevron" />
                </button>
                {profileOpen && (
                  <div className="site-profile-menu" id="site-profile-menu">
                    <Link href="/reservations" aria-current={path === '/reservations' ? 'page' : undefined} onClick={() => setProfileOpen(false)}>
                      <Icon name="bed" size={19} />{t('My stays')}
                    </Link>
                    <Link href="/account" aria-current={path === '/account' ? 'page' : undefined} onClick={() => setProfileOpen(false)}>
                      <Icon name="user" size={19} />{t('Account')}
                    </Link>
                    <button type="button" className="site-profile-signout" onClick={signOut}>
                      <Icon name="log-out" size={19} />{t('Sign out')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/account" className="site-header-signin" aria-current={path === '/account' ? 'page' : undefined}>
                {t('SIGN IN')}
              </Link>
            )}
          </div>
          <Link href="/availability" className="btn-primary hidden whitespace-nowrap lg:inline-flex"><T>{"BOOK A STAY ↗"}</T></Link>
          <button ref={mobileButtonRef} type="button" onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={t("Toggle navigation")}
            className="grid h-10 w-10 place-items-center border border-line text-xl xl:hidden"
          >
            <Icon name={menu ? 'close' : 'menu'} size={21} />
          </button>
        </div>
      </div>
      {menu && <nav ref={mobileNavRef} aria-label={t("Mobile navigation")}
        className="grid max-h-[calc(100dvh-110px)] gap-1 overflow-y-auto border-t border-line bg-paper px-6 py-5 xl:hidden"
      >
        {links.map(([href, label]) => <Link
          onClick={() => setMenu(false)}
          className="border-b border-line py-3 text-xs tracking-widest"
          href={href}
          key={href}
        >
          {t(label)}
        </Link>)}
        <div className="site-mobile-account">
          {account ? (
            <>
              <div className="site-mobile-profile">
                <span className="site-profile-avatar" aria-hidden="true">{initials}</span>
                <span className="truncate">{profileName}</span>
              </div>
              <Link href="/reservations" onClick={() => setMenu(false)} aria-current={path === '/reservations' ? 'page' : undefined}>
                <Icon name="bed" size={19} />{t('My stays')}
              </Link>
              <Link href="/account" onClick={() => setMenu(false)} aria-current={path === '/account' ? 'page' : undefined}>
                <Icon name="user" size={19} />{t('Account')}
              </Link>
              <button type="button" onClick={signOut}>
                <Icon name="log-out" size={19} />{t('Sign out')}
              </button>
            </>
          ) : (
            <Link href="/account" onClick={() => setMenu(false)}>
              <Icon name="user" size={19} />{t('SIGN IN')}
            </Link>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-4 sm:hidden">
          <span className="text-xs tracking-wider text-muted">{t('Toggle color theme')}</span>
          <button
            type="button"
            onClick={() => setTheme((value) => (value === 'light' ? 'night' : 'light'))}
            className="grid h-10 w-10 place-items-center border border-line"
            aria-label={t('Toggle color theme')}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          </button>
        </div>
      </nav>}
    </header>
    <main id="main-content">
      {children}
    </main>
    <footer className="bg-forest py-20 text-surface">
      <div className="container-site">
        <div className="grid gap-12 border-b border-surface/25 pb-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="site-footer-brand-link" aria-label="Dylan Grand Hotel — Home">
              <span className="site-brand-stacked" aria-hidden="true" />
            </Link>
            <p className="mt-6 max-w-[260px] text-sm leading-8 text-surface/70"><T>{"An intimate escape in the heart of Saigon. Quietly extraordinary, effortlessly yours."}</T></p>
          </div>
          <div>
            <h3 className="eyebrow text-gold"><T>{"EXPLORE"}</T></h3>
            <div className="mt-5 grid gap-3 text-sm">
              {links.slice(0, 4).map(([href, label]) => <Link href={href} key={href} className="hover:text-gold">
                {t(label)}
              </Link>)}
            </div>
          </div>
          <div>
            <h3 className="eyebrow text-gold"><T>{"YOUR STAY"}</T></h3>
            <div className="mt-5 grid gap-3 text-sm">
              <Link href="/booking"><T>{"Your reservation"}</T></Link>
              <Link href="/reservations"><T>{"Manage a booking"}</T></Link>
              <Link href="/account"><T>{"My account"}</T></Link>
            </div>
          </div>
          <div>
            <h3 className="eyebrow text-gold"><T>{"THE LOCATION"}</T></h3>
            <p className="mt-5 text-sm leading-8"><T>{"Ho Chi Minh City, Vietnam"}</T></p>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-5 pt-8 text-[10px] tracking-widest text-surface/60">
          <span>© {new Date().getFullYear()} <T>{"DYLAN GRAND HOTEL"}</T></span>
          <span><T>{"Preview · Sample rates and availability · No live bookings or payments"}</T></span>
        </div>
      </div>
    </footer>
    <button className="fixed bottom-4 right-4 z-40 grid h-10 w-10 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12 place-items-center border border-line bg-paper text-ink shadow-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t("Back to top")}
    ><Icon name="arrow-up" size={19} /></button>
  </>;
}
