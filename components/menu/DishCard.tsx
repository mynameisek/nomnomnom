'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { MenuItem } from '@/lib/types/menu';

interface DishCardProps {
  item: MenuItem;
  /** When true, allergen chips are shown expanded (e.g. when allergen filter is active) */
  showAllergens?: boolean;
  /** Called when user taps the full-depth enrichment preview row to open detail sheet */
  onTapDetail?: (item: MenuItem) => void;
}

export default function DishCard({ item, showAllergens = false, onTapDetail }: DishCardProps) {
  const { lang, t } = useLanguage();
  const [allergensExpanded, setAllergensExpanded] = useState(false);

  const translatedName = item.name_translations[lang] ?? item.name_original;
  const showOriginalName =
    item.name_original &&
    translatedName.toLowerCase().trim() !== item.name_original.toLowerCase().trim();

  const translatedDescription =
    item.description_translations?.[lang] ?? item.description_original;

  const isVerified = item.trust_signal === 'verified';
  const trustLabel = isVerified ? t('trust_verified') : t('trust_inferred');
  const trustClass = isVerified
    ? 'bg-white/5 border-white/15 text-brand-muted'
    : 'bg-brand-orange/8 border-brand-orange/15 text-brand-orange/70';

  const hasAllergens = (item.allergens ?? []).length > 0;
  const allergensVisible = showAllergens || allergensExpanded;

  // Enrichment state helpers
  const isPendingFood = !item.is_beverage && item.enrichment_status === 'pending';
  const isEnriched = item.enrichment_status === 'enriched';
  const isFullDepth = isEnriched && item.enrichment_depth === 'full';
  const isMinimalDepth = isEnriched && item.enrichment_depth === 'minimal';

  // Translated enrichment fields (fallback to original French)
  const enrichTrans = item.enrichment_translations?.[lang];
  const origin = enrichTrans?.origin ?? item.enrichment_origin;
  const culturalNote = enrichTrans?.cultural_note ?? item.enrichment_cultural_note;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/8">
      {/* Name row + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-brand-white font-semibold text-sm leading-snug">
            {translatedName}
          </h3>
          {showOriginalName && (
            <p className="text-brand-muted text-xs mt-0.5 truncate">
              {item.name_original}
            </p>
          )}
        </div>
        {item.price && (
          <span className="text-brand-orange font-semibold text-sm flex-shrink-0 ml-2">
            {item.price}
          </span>
        )}
      </div>

      {/* Description */}
      {translatedDescription && (
        <p className="text-brand-muted text-xs leading-relaxed">
          {translatedDescription}
        </p>
      )}

      {/* Enrichment states */}
      {isPendingFood && (
        // State 1: Pending skeleton shimmer
        <div className="h-3 w-3/4 rounded-full bg-white/10 animate-pulse mt-1" />
      )}

      {isEnriched && !item.is_beverage && (
        // Enriched item CTA — tappable row to open detail sheet
        <button
          type="button"
          onClick={() => onTapDetail?.(item)}
          className="flex items-center gap-2 mt-1 px-3 py-2 -mx-1 rounded-lg bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-white/12 transition-colors text-left w-[calc(100%+0.5rem)] group"
        >
          {origin && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange/70 text-[10px] font-medium">
              {origin.split(',')[0].trim()}
            </span>
          )}
          <span className="text-brand-muted/60 text-xs truncate flex-1">
            {culturalNote
              ? `${culturalNote.slice(0, 55)}${culturalNote.length > 55 ? '...' : ''}`
              : t('card_see_detail')}
          </span>
          <svg className="w-4 h-4 text-brand-muted/40 flex-shrink-0 group-hover:text-brand-orange/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Bottom row: trust badge + dietary tags + allergen toggle */}
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {/* Trust badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${trustClass}`}
        >
          {isVerified ? '✓' : '~'} {trustLabel}
        </span>

        {/* Dietary tag chips */}
        {item.dietary_tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-brand-orange/8 border border-brand-orange/15 text-brand-orange/80 text-xs"
          >
            {t(`tag_${tag}`)}
          </span>
        ))}

        {/* Allergen toggle — shown only if dish has allergens and they're not forced visible */}
        {hasAllergens && !showAllergens && (
          <button
            type="button"
            onClick={() => setAllergensExpanded(!allergensExpanded)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/12 text-brand-muted text-xs hover:bg-white/8 transition-colors"
          >
            {t('card_allergens')}
            <svg
              className={`w-3 h-3 transition-transform ${allergensExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Allergen chips — hidden by default, shown on click or when filter is active */}
      {hasAllergens && allergensVisible && (
        <div className="flex flex-wrap gap-1.5">
          {item.allergens.map((allergen) => (
            <span
              key={allergen}
              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/12 text-brand-muted text-xs"
            >
              {t(`allergen_${allergen}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
