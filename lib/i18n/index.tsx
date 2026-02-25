'use client';
// =============================================================================
// i18n system — LanguageProvider + useLanguage hook
// =============================================================================
// SSR safety: initial state is 'fr' (not from localStorage) to avoid hydration
// mismatch. The useEffect corrects it client-side on mount (Pitfall 1 from research).
// Never read localStorage in useState initializer — causes hydration errors with SSR.
// =============================================================================

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translations } from './translations';
import type { TranslationKey } from './translations';

/** Supported language codes for v1.1 */
export type Lang = 'fr' | 'en' | 'tr' | 'de';

/** All supported language codes as a constant array */
export const SUPPORTED_LANGS: Lang[] = ['fr', 'en', 'tr', 'de'];

const STORAGE_KEY = 'nom_lang';

/**
 * Detect browser language — maps navigator.language first 2 chars to a supported Lang.
 * Falls back to 'fr' if not supported or running on server.
 */
function detectBrowserLang(): Lang {
  if (typeof window === 'undefined') return 'fr'; // SSR fallback
  const nav = navigator.language?.slice(0, 2).toLowerCase() as Lang;
  return SUPPORTED_LANGS.includes(nav) ? nav : 'fr';
}

type LanguageContextValue = {
  /** Currently active language */
  lang: Lang;
  /** Set language — persists to localStorage */
  setLang: (l: Lang) => void;
  /** Translate a UI string key — falls back to the key itself if not found */
  t: (key: TranslationKey | string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (k) => k,
});

/**
 * LanguageProvider — wraps the menu shell to provide language context.
 *
 * Mount behavior:
 * 1. Renders with 'fr' default (SSR-safe)
 * 2. On client mount: reads localStorage 'nom_lang', falls back to navigator.language
 * 3. setLang() persists the choice to localStorage for next visit
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR-safe initial value — never read localStorage here (hydration mismatch risk)
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    // Client-only correction: read from localStorage, fallback to browser language
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    const resolved = stored && SUPPORTED_LANGS.includes(stored) ? stored : detectBrowserLang();
    setLangState(resolved);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  const t = (key: TranslationKey | string): string =>
    (translations[lang] as Record<string, string>)[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** useLanguage — consume language context in any client component under LanguageProvider */
export const useLanguage = () => useContext(LanguageContext);
