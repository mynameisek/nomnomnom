'use client';
// =============================================================================
// MenuAccordion — category/subcategory accordion for unfiltered menu view
// =============================================================================
// Used by MenuShell when no filters are active.
// Dish cards are rendered via the imported DishCard component (not inline).
// =============================================================================

import { useState } from 'react';
import type { MenuItem } from '@/lib/types/menu';
import DishCard from '@/components/menu/DishCard';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Leaf group: items sharing same category + subcategory */
interface SubGroup {
  key: string;
  subcategory: string | null;
  items: MenuItem[];
}

/** Top-level section: a category that may contain multiple subgroups */
interface Section {
  category: string;
  subGroups: SubGroup[];
  totalItems: number;
  hasSubcategories: boolean;
}

// ─── Grouping logic ──────────────────────────────────────────────────────────

function buildSections(items: MenuItem[]): Section[] {
  const sections: Section[] = [];
  let currentCat = '';
  let currentSub = '';

  for (const item of items) {
    const cat = item.category ?? 'Autres';
    const sub = item.subcategory ?? '';

    if (cat !== currentCat) {
      // New top-level section
      currentCat = cat;
      currentSub = sub;
      sections.push({
        category: cat,
        subGroups: [{ key: `${cat}|||${sub}`, subcategory: item.subcategory, items: [item] }],
        totalItems: 1,
        hasSubcategories: !!item.subcategory,
      });
    } else if (sub !== currentSub) {
      // New subgroup within same section
      currentSub = sub;
      const section = sections[sections.length - 1];
      section.subGroups.push({ key: `${cat}|||${sub}`, subcategory: item.subcategory, items: [item] });
      section.totalItems++;
      if (item.subcategory) section.hasSubcategories = true;
    } else {
      // Same group
      const section = sections[sections.length - 1];
      const subGroup = section.subGroups[section.subGroups.length - 1];
      subGroup.items.push(item);
      section.totalItems++;
    }
  }

  return sections;
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronDown({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`w-5 h-5 text-brand-muted transition-transform duration-200 ${open ? 'rotate-180' : ''} ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Sub-accordion (nested inside a parent group like "Boissons") ────────────

function SubAccordion({ subGroup, categoryTranslations }: { subGroup: SubGroup; categoryTranslations?: Record<string, string> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white/3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-brand-white/80 font-medium text-xs">
            {(subGroup.subcategory && categoryTranslations?.[subGroup.subcategory]) ?? subGroup.subcategory}
          </span>
          <span className="text-brand-muted/60 text-xs">
            {subGroup.items.length}
          </span>
        </div>
        <ChevronDown open={open} className="w-4 h-4" />
      </button>
      {open && (
        <div className="flex flex-col gap-2 p-2">
          {subGroup.items.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top-level section accordion ─────────────────────────────────────────────

function SectionAccordion({ section, defaultOpen, categoryTranslations }: { section: Section; defaultOpen: boolean; categoryTranslations?: Record<string, string> }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-white/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 hover:bg-white/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-white font-semibold text-sm">
            {categoryTranslations?.[section.category] ?? section.category}
          </span>
          <span className="text-brand-muted text-xs">
            {section.totalItems}
          </span>
        </div>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-3">
          {section.hasSubcategories
            ? section.subGroups.map((sg, sgIdx) =>
                sg.subcategory ? (
                  <SubAccordion key={`${sg.key}-${sgIdx}`} subGroup={sg} categoryTranslations={categoryTranslations} />
                ) : (
                  // Items without subcategory rendered directly
                  sg.items.map((item) => <DishCard key={item.id} item={item} />)
                )
              )
            : section.subGroups.flatMap((sg) =>
                sg.items.map((item) => <DishCard key={item.id} item={item} />)
              )}
        </div>
      )}
    </section>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function MenuAccordion({ items, categoryTranslations }: { items: MenuItem[]; categoryTranslations?: Record<string, string> }) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const sections = buildSections(sorted);

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 text-brand-muted">
        <p className="text-4xl mb-4">&#127869;</p>
        <p className="text-sm">No dishes were extracted from this menu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section, i) => (
        <SectionAccordion key={`${section.category}-${i}`} section={section} defaultOpen={i === 0} categoryTranslations={categoryTranslations} />
      ))}
    </div>
  );
}
