'use client';
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
    <div className="border-b border-forest/10 bg-forest py-2 text-center text-[9px] font-medium tracking-[.22em] text-surface uppercase">AN INTIMATE ESCAPE · INSPIRED BY THE ART OF SLOW LIVING</div>
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="absolute left-0 top-0 h-[2px] bg-gold transition-[width]"
        style={{ width: `${scroll * 100}%` }}
      />
      <div className="container-site flex h-[88px] items-center justify-between gap-5">
        <Link href="/" className="flex min-w-[145px] flex-col leading-none">
          <span className="font-display text-[34px] tracking-[.035em]">DYLAN</span>
          <span className="mt-1 text-[8px] tracking-[.34em]">GRAND HOTEL</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {links.map(([href, label]) => <Link key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
            className={`whitespace-nowrap text-[10px] font-semibold tracking-[.08em] transition-colors hover:text-gold ${path === href ? 'text-gold' : 'text-ink'}`}
          >
            {label}
          </Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(v => v === 'light' ? 'night' : 'light')}
            aria-label="Toggle color theme"
            title="Toggle theme"
            className="grid h-10 w-10 place-items-center border border-line text-lg"
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
          <Link href="/availability" className="btn-primary hidden whitespace-nowrap sm:inline-flex">BOOK A STAY ↗</Link>
          <button onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label="Toggle navigation"
            className="grid h-11 w-11 place-items-center border border-line text-xl lg:hidden"
          >
            {menu ? '×' : '☰'}
          </button>
        </div>
      </div>
      {menu && <nav aria-label="Mobile navigation"
        className="grid gap-1 border-t border-line bg-paper px-6 py-5 lg:hidden"
      >
        {links.map(([href, label]) => <Link onClick={() => setMenu(false)}
          className="border-b border-line py-3 text-xs tracking-widest"
          href={href}
          key={href}
        >
          {label}
        </Link>)}
      </nav>}
    </header>
    <main id="main-content">
      {children}
    </main>
    <footer className="bg-forest py-20 text-surface">
      <div className="container-site">
        <div className="grid gap-12 border-b border-surface/25 pb-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="font-display text-4xl">DYLAN GRAND HOTEL</h2>
            <p className="mt-6 max-w-[260px] text-sm leading-8 text-surface/70">An intimate escape in the heart of Saigon. Quietly extraordinary, effortlessly yours.</p>
          </div>
          <div>
            <h3 className="eyebrow text-gold">EXPLORE</h3>
            <div className="mt-5 grid gap-3 text-sm">
              {links.slice(0, 4).map(([href, label]) => <Link href={href} key={href} className="hover:text-gold">
                {label}
              </Link>)}
            </div>
          </div>
          <div>
            <h3 className="eyebrow text-gold">YOUR STAY</h3>
            <div className="mt-5 grid gap-3 text-sm">
              <Link href="/booking">Your reservation</Link>
              <Link href="/reservations">Manage a booking</Link>
              <Link href="/account">My account</Link>
            </div>
          </div>
          <div>
            <h3 className="eyebrow text-gold">THE LOCATION</h3>
            <p className="mt-5 text-sm leading-8">Ho Chi Minh City, Vietnam</p>
            <p className="mt-4 text-xs text-surface/60">Fictional property · Design concept</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-5 pt-8 text-[10px] tracking-widest text-surface/60">
          <span>© {new Date().getFullYear()} DYLAN GRAND HOTEL</span>
          <span>ILLUSTRATIVE IMAGERY & PRICING · NO REAL BOOKINGS</span>
        </div>
      </div>
    </footer>
    <button className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center border border-line bg-paper text-ink shadow-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
    >↑</button>
  </>;
}
