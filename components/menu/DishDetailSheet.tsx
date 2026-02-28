'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import type { MenuItem } from '@/lib/types/menu';

interface DishDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DishDetailSheet({ item, isOpen, onClose }: DishDetailSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
          <motion.div
            ref={panelRef}
            key="panel"
            className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center pointer-events-none"
          >
            <motion.div
              className="pointer-events-auto w-full md:max-w-md md:mx-4 bg-brand-bg border-t border-white/10 md:border md:border-white/10 md:rounded-2xl overflow-hidden max-h-[85vh] md:max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-2xl"
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Close button (desktop) */}
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex absolute top-3 right-3 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors text-brand-muted"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 overscroll-contain">
                {/* Image — compact, only if real photo exists */}
                {item.image_url && (
                  <div className="relative w-full aspect-[2/1] md:aspect-[5/2]">
                    <Image
                      src={item.image_url}
                      alt={item.canonical_name ?? item.name_original}
                      fill
                      className="object-cover"
                      placeholder={item.image_placeholder ? 'blur' : 'empty'}
                      blurDataURL={item.image_placeholder ?? undefined}
                      sizes="(max-width: 768px) 100vw, 448px"
                    />
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-bg to-transparent" />
                  </div>
                )}

                {/* Text content */}
                <div className={`px-5 pb-8 space-y-3 ${item.image_url ? '-mt-6 relative' : 'pt-3'}`}>
                  {/* Name + price row */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-brand-white font-bold text-lg leading-snug">
                      {item.canonical_name ?? item.name_original}
                    </h2>
                    {item.price && (
                      <span className="text-brand-orange font-bold text-base flex-shrink-0 mt-0.5">
                        {item.price}
                      </span>
                    )}
                  </div>

                  {/* Original name if different */}
                  {item.canonical_name && item.canonical_name !== item.name_original && (
                    <p className="text-brand-muted/60 text-xs -mt-2">{item.name_original}</p>
                  )}

                  {/* Origin pill */}
                  {item.enrichment_origin && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange/80 text-xs font-medium">
                        {item.enrichment_origin}
                      </span>
                    </div>
                  )}

                  {/* Cultural note */}
                  {item.enrichment_cultural_note && (
                    <p className="text-brand-muted text-sm leading-relaxed">
                      {item.enrichment_cultural_note}
                    </p>
                  )}

                  {/* Key ingredients */}
                  {item.enrichment_ingredients && item.enrichment_ingredients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-brand-white/50 text-[11px] uppercase tracking-wider font-medium">
                        Ingrédients typiques
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.enrichment_ingredients.map((ingredient, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eating tips */}
                  {item.enrichment_eating_tips && (
                    <p className="text-brand-muted/70 text-xs italic leading-relaxed">
                      {item.enrichment_eating_tips}
                    </p>
                  )}

                  {/* Allergens */}
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-brand-white/50 text-[11px] uppercase tracking-wider font-medium">
                        Allergènes
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="px-2 py-0.5 rounded-full bg-red-500/8 border border-red-500/15 text-red-400/80 text-xs"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo credit */}
                  {item.image_url && item.image_credit && item.image_credit_url && (
                    <a
                      href={item.image_credit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-brand-muted/40 text-[10px] hover:text-brand-muted/60 transition-colors pt-2"
                    >
                      {item.image_credit}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
