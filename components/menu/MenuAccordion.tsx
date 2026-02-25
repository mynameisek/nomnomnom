'use client';

import { useState } from 'react';
import type { MenuItem, TrustSignal } from '@/lib/types/menu';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryGroup {
  key: string;
  category: string;
  subcategory: string | null;
  items: MenuItem[];
}

// ─── Grouping logic ──────────────────────────────────────────────────────────

function groupByCategory(items: MenuItem[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  let currentKey = '';

  for (const item of items) {
    const cat = item.category ?? 'Autres';
    const sub = item.subcategory ?? '';
    const key = `${cat}|||${sub}`;

    if (key !== currentKey) {
      currentKey = key;
      groups.push({
        key,
        category: cat,
        subcategory: item.subcategory,
        items: [],
      });
    }
    groups[groups.length - 1].items.push(item);
  }

  return groups;
}

// ─── Trust signal badge ──────────────────────────────────────────────────────

function TrustBadge({ signal }: { signal: TrustSignal }) {
  if (signal === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-xs font-medium border border-brand-green/20">
        ✓ Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-medium border border-brand-orange/20">
      ~ Inferred
    </span>
  );
}

// ─── Dish card ───────────────────────────────────────────────────────────────

function DishCard({ item }: { item: MenuItem }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/8">
      {/* Name + price row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-brand-white font-semibold text-sm leading-snug flex-1">
          {item.name_original}
        </h3>
        {item.price && (
          <span className="text-brand-orange font-semibold text-sm flex-shrink-0">
            {item.price}
          </span>
        )}
      </div>

      {/* Description */}
      {item.description_original && (
        <p className="text-brand-muted text-xs leading-relaxed">
          {item.description_original}
        </p>
      )}

      {/* Trust signal + allergens */}
      {(item.trust_signal || item.allergens.length > 0 || item.dietary_tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <TrustBadge signal={item.trust_signal} />

          {item.allergens.map((allergen) => (
            <span
              key={allergen}
              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs"
            >
              {allergen}
            </span>
          ))}

          {item.dietary_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chevron icon ────────────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-brand-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Accordion section ───────────────────────────────────────────────────────

function CategorySection({ group, defaultOpen }: { group: CategoryGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const label = group.subcategory
    ? `${group.category} — ${group.subcategory}`
    : group.category;

  return (
    <section className="rounded-2xl border border-white/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 hover:bg-white/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-white font-semibold text-sm">
            {label}
          </span>
          <span className="text-brand-muted text-xs">
            {group.items.length}
          </span>
        </div>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-3">
          {group.items.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function MenuAccordion({ items }: { items: MenuItem[] }) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const groups = groupByCategory(sorted);

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-brand-muted">
        <p className="text-4xl mb-4">&#127869;</p>
        <p className="text-sm">No dishes were extracted from this menu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, i) => (
        <CategorySection key={group.key} group={group} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
