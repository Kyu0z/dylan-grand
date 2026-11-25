import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language, Localized } from './domain';

type Theme = 'light' | 'dark';
type LocaleContextValue = {
  language: Language;
  setLanguage: (value: Language) => void;
  theme: Theme;
  setTheme: (value: Theme) => void;
  t: (value: Localized | string) => string;
};
const Context = createContext<LocaleContextValue | null>(null);
const readChoice = <T extends string>(key: string, valid: readonly T[], fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return valid.find((option) => option === value) ?? fallback;
  } catch {
    return fallback;
  }
};

export function LocaleProvider({ children }: { children: ReactNode; }) {
  const [language, setLanguage] = useState<Language>(() => readChoice('dgh-admin-language', ['en', 'vi'], 'en'));
  const [theme, setTheme] = useState<Theme>(() => readChoice('dgh-admin-theme', ['light', 'dark'], 'light'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
    try {
      localStorage.setItem('dgh-admin-language', language);
      localStorage.setItem('dgh-admin-theme', theme);
    } catch {
      // Browser storage is optional.
    }
  }, [language, theme]);

  const value = useMemo<LocaleContextValue>(() => ({
    language, setLanguage, theme, setTheme,
    t: (input) => (typeof input === 'string' ? input : input[language]),
  }), [language, theme]);

  return <Context.Provider value={value}>
    {children}
  </Context.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(Context);
  if (!context) throw new Error('useLocale requires LocaleProvider');
  return context;
}
