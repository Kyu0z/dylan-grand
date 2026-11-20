'use client';
import { T, useI18n } from '@/components/language-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
const links = [
  ['/', 'THE HOTEL'],
  ['/rooms', 'ROOMS & SUITES'],
  ['/availability', 'AVAILABILITY'],
  ['/experiences', 'EXPERIENCES'],
  ['/reservations', 'MY STAYS'],
  ['/account', 'MY ACCOUNT']
];
export default function SiteShell({ children }: { children: ReactNode; }) {
  const { t, locale, setLocale } = useI18n();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
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
      <div className="container-site flex h-[74px] items-center justify-between gap-2 sm:h-[88px] sm:gap-4">
        <Link href="/" className="flex min-w-0 shrink-0 flex-col leading-none">
          <span className="font-display text-[29px] tracking-[.035em] sm:text-[34px]"><T>{"DYLAN"}</T></span>
          <span className="mt-1 text-[8px] tracking-[.34em]"><T>{"GRAND HOTEL"}</T></span>
        </Link>
        <nav aria-label={t("Main navigation")} className="hidden items-center gap-4 xl:flex 2xl:gap-7">
          {links.map(([href, label]) => <Link key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
            className={`whitespace-nowrap text-[10px] font-semibold tracking-[.08em] transition-colors hover:text-gold ${path === href ? 'text-gold' : 'text-ink'}`}
          >
            {t(label)}
          </Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
          <button onClick={() => setTheme(v => v === 'light' ? 'night' : 'light')}
            aria-label={t("Toggle color theme")}
            title={t("Toggle theme")}
            className="hidden h-10 w-10 place-items-center border border-line text-lg sm:grid"
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
          <Link href="/availability" className="btn-primary hidden whitespace-nowrap lg:inline-flex"><T>{"BOOK A STAY ↗"}</T></Link>
          <button onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={t("Toggle navigation")}
            className="grid h-10 w-10 place-items-center border border-line text-xl xl:hidden"
          >
            {menu ? '×' : '☰'}
          </button>
        </div>
      </div>
      {menu && <nav aria-label={t("Mobile navigation")}
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
        <div className="flex items-center justify-between gap-3 pt-4 sm:hidden">
          <span className="text-xs tracking-wider text-muted">{t('Toggle color theme')}</span>
          <button
            type="button"
            onClick={() => setTheme((value) => (value === 'light' ? 'night' : 'light'))}
            className="grid h-10 w-10 place-items-center border border-line"
            aria-label={t('Toggle color theme')}
          >
            {theme === 'light' ? '☾' : '☀'}
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
            <h2 className="font-display text-4xl"><T>{"DYLAN GRAND HOTEL"}</T></h2>
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
            <p className="mt-4 text-xs text-surface/60"><T>{"Fictional property · Design concept"}</T></p>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-5 pt-8 text-[10px] tracking-widest text-surface/60">
          <span>© {new Date().getFullYear()} <T>{"DYLAN GRAND HOTEL"}</T></span>
          <span><T>{"ILLUSTRATIVE IMAGERY & PRICING · NO REAL BOOKINGS"}</T></span>
        </div>
      </div>
    </footer>
    <button className="fixed bottom-4 right-4 z-40 grid h-10 w-10 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12 place-items-center border border-line bg-paper text-ink shadow-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t("Back to top")}
    >↑</button>
  </>;
}
