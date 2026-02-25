"use client";

import { useState } from "react";
import { FOOD } from "@/lib/data";

type FoodImageProps = {
  index: number;
  className?: string;
  size?: number;
};

export default function FoodImage({ index, className = "", size }: FoodImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const f = FOOD[index % FOOD.length];

  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${className}`}
      style={{
        background: f.grad,
        ...(size ? { width: size, height: size } : {}),
      }}
    >
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={f.url}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className="w-full h-full object-cover block transition-opacity duration-400"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
      {(!loaded || error) && (
        <div className="absolute inset-0 flex items-center justify-center text-lg">
          {f.emoji}
        </div>
      )}
    </div>
  );
}
