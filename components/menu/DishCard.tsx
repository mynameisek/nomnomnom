'use client';
// =============================================================================
// DishCard — translated dish card with trust badge, dietary tags, allergen chips
// =============================================================================
// Design system: no green anywhere. Trust badge neutral/warm. Allergen chips
// neutral. Dietary tag chips warm orange. Dish name in active language.
// =============================================================================

import { useLanguage } from '@/lib/i18n';
import type { MenuItem } from '@/lib/types/menu';

interface DishCardProps {
  item: MenuItem;
}

export default function DishCard({ item }: DishCardProps) {
  const { lang, t } = useLanguage();

  // Translated name — fallback to original if translation absent or identical
  const translatedName = item.name_translations[lang] ?? item.name_original;
  const showOriginalName =
    item.name_original &&
    translatedName.toLowerCase().trim() !== item.name_original.toLowerCase().trim();

  // Translated description — fallback to original
  const translatedDescription =
    item.description_translations?.[lang] ?? item.description_original;

  // Trust badge
  const isVerified = item.trust_signal === 'verified';
  const trustLabel = isVerified ? t('trust_verified') : t('trust_inferred');
  const trustClass = isVerified
    ? 'bg-white/5 border-white/15 text-brand-muted'
    : 'bg-brand-orange/8 border-brand-orange/15 text-brand-orange/70';

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

      {/* Bottom row: trust badge + dietary tags + allergen chips */}
      {(item.allergens.length > 0 || item.dietary_tags.length > 0 || true) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {/* Trust badge — always shown */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${trustClass}`}
          >
            {isVerified ? '✓' : '~'} {trustLabel}
          </span>

          {/* Dietary tag chips — warm orange, never green */}
          {item.dietary_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-brand-orange/8 border border-brand-orange/15 text-brand-orange/80 text-xs"
            >
              {t(`tag_${tag}`)}
            </span>
          ))}

          {/* Allergen chips — neutral, never green, never alarming */}
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
