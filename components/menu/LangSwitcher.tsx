'use client';
// =============================================================================
// LangSwitcher — globe icon dropdown for FR/EN/TR/DE language switching
// =============================================================================
// Globe SVG button toggles dropdown. Clicking a language calls setLang() and
// closes the dropdown. Click-outside closes the dropdown.
// Active language highlighted in text-brand-orange.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useLanguage, SUPPORTED_LANGS } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

/** Human-readable labels for each language */
const LANG_LABELS: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
};

export default function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Globe icon button */}
      <button
        type="button"
        aria-label="Switch language"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-brand-muted hover:text-brand-white hover:bg-white/8 transition-colors"
      >
        {/* Globe SVG — 20px outline */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] rounded-xl bg-brand-bg border border-white/10 shadow-xl overflow-hidden">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                lang === l
                  ? 'text-brand-orange font-medium'
                  : 'text-brand-muted'
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
