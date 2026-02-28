'use client';

import Image from 'next/image';

interface DishImageProps {
  src: string;
  alt: string;
  placeholder?: string | null;
  className?: string;
}

/**
 * Square dish image with blur-up loading via next/image.
 * Aspect ratio is controlled by the parent via className (defaults to aspect-square).
 */
export default function DishImage({ src, alt, placeholder, className }: DishImageProps) {
  return (
    <div className={`relative w-full rounded-lg overflow-hidden ${className ?? 'aspect-square'}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        placeholder={placeholder ? 'blur' : 'empty'}
        blurDataURL={placeholder ?? undefined}
        sizes="(max-width: 768px) calc(100vw - 2rem), 400px"
      />
    </div>
  );
}
