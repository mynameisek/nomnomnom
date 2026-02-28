'use client';

import { Sheet } from 'react-modal-sheet';
import type { MenuItem } from '@/lib/types/menu';

interface DishDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DishDetailSheet({ item, isOpen, onClose }: DishDetailSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content">
      <Sheet.Container className="!bg-brand-bg border-t border-white/10">
        <Sheet.Header className="!bg-brand-bg" />
        <Sheet.Content>
          {item && (
            <div className="px-5 pb-8 pt-2 space-y-4">
              {/* Dish name */}
              <h2 className="text-brand-white font-bold text-lg leading-snug">
                {item.canonical_name ?? item.name_original}
              </h2>

              {/* Origin line */}
              {item.enrichment_origin && (
                <p className="text-brand-orange/70 text-sm -mt-2">
                  {item.enrichment_origin}
                </p>
              )}

              {/* Cultural note */}
              {item.enrichment_cultural_note && (
                <p className="text-brand-muted text-sm leading-relaxed">
                  {item.enrichment_cultural_note}
                </p>
              )}

              {/* Key ingredients */}
              {item.enrichment_ingredients && item.enrichment_ingredients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-brand-white/60 text-xs uppercase tracking-wider">
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
                <p className="text-brand-muted/70 text-xs italic">
                  {item.enrichment_eating_tips}
                </p>
              )}
            </div>
          )}
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
