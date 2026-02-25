'use client';
// =============================================================================
// AllergenBanner — single discreet allergen disclaimer banner
// =============================================================================
// Always visible at top of menu page (not conditional, not per-card).
// Light amber/warm tone — not alarming. Localised via useLanguage().
// No green anywhere — warm/neutral palette only.
// =============================================================================

import { useLanguage } from '@/lib/i18n';

export default function AllergenBanner() {
  const { t } = useLanguage();

  return (
    <div className="w-full px-4 py-2.5 rounded-xl bg-brand-orange/5 border border-brand-orange/10">
      <p className="text-brand-muted/80 text-xs leading-relaxed">
        {t('allergen_disclaimer')}
      </p>
    </div>
  );
}
