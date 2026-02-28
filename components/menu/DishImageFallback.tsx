'use client';

import { getCuisineGradient, getDishEmoji } from '@/lib/dish-fallback';

interface DishImageFallbackProps {
  origin: string | null;
  category: string | null;
  ingredients: string[] | null;
  className?: string;
}

/**
 * Gradient + emoji fallback for dishes without stock photos.
 * Aspect ratio is controlled by the parent via className (defaults to aspect-square).
 */
export default function DishImageFallback({
  origin,
  category,
  ingredients,
  className,
}: DishImageFallbackProps) {
  const [from, to] = getCuisineGradient(origin);
  const emoji = getDishEmoji(category, ingredients);

  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden flex items-center justify-center ${className ?? 'aspect-square'}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="text-4xl select-none">{emoji}</span>
    </div>
  );
}
