'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { vietnamese } from '@/lib/translations';

export type Locale = 'en' | 'vi';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string) => string;
}

const STORAGE_KEY = 'dylan-grand-locale';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server and initial client render are both English: no hydration mismatch.
  const [locale, setLocale] = useState<Locale>('en');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') setLocale(stored);
    setInitialized(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (initialized) window.localStorage.setItem(STORAGE_KEY, locale);
  }, [initialized, locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (message) => {
        if (locale === 'en') return message;
        if (vietnamese[message]) return vietnamese[message];

        // Handle option labels without creating a translation entry for every count.
        const count = /^(\d+) (adults?|guests?|rooms?|stars?)$/.exec(message);
        if (count) {
          const unit = count[2].startsWith('adult')
            ? 'người lớn'
            : count[2].startsWith('guest')
              ? 'khách'
              : count[2].startsWith('room')
                ? 'phòng'
                : 'sao';
          return `${count[1]} ${unit}`;
        }

        return message;
      },
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be called inside LanguageProvider');
  return context;
}

/** Keep translated static content reactive to locale changes. */
export function T({ children }: { children: string }) {
  const { t } = useI18n();
  return <>{t(children)}</>;
}
