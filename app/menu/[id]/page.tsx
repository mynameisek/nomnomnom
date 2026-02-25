import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import type { MenuWithItems, MenuItem, TrustSignal } from '@/lib/types/menu';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: menu } = await supabase
    .from('menus')
    .select('restaurant_name')
    .eq('id', id)
    .single();

  const name = menu?.restaurant_name ?? 'Menu';
  return {
    title: `${name} | NOM`,
    description: `View parsed dishes and translations for ${name}.`,
  };
}

// ─── Trust signal badge ────────────────────────────────────────────────────────

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

// ─── Dish card ────────────────────────────────────────────────────────────────

function DishCard({ item }: { item: MenuItem }) {
  const translationFr = item.name_translations?.fr;
  const translationEn = item.name_translations?.en;

  return (
    <div className="flex flex-col gap-2 px-4 py-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
      {/* Name row */}
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

      {/* Translations */}
      {(translationFr || translationEn) && (
        <div className="flex flex-wrap gap-2">
          {translationFr && translationFr !== item.name_original && (
            <span className="text-brand-muted text-xs">
              <span className="opacity-50">FR</span> {translationFr}
            </span>
          )}
          {translationEn && translationEn !== item.name_original && (
            <span className="text-brand-muted text-xs">
              <span className="opacity-50">EN</span> {translationEn}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {item.description_original && (
        <p className="text-brand-muted text-xs leading-relaxed">
          {item.description_original}
        </p>
      )}

      {/* Trust signal + allergens row */}
      <div className="flex flex-wrap items-center gap-2 mt-1">
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
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ sourceType }: { sourceType: string | null }) {
  const labels: Record<string, string> = {
    url: 'URL scan',
    photo: 'Photo scan',
    qr: 'QR scan',
  };
  const label = sourceType ? (labels[sourceType] ?? sourceType) : 'Unknown source';
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs font-medium">
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MenuPage({ params }: PageProps) {
  const { id } = await params;

  const { data: menu, error } = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('id', id)
    .single();

  if (error || !menu) {
    notFound();
  }

  const typedMenu = menu as MenuWithItems;
  const dishes = typedMenu.menu_items ?? [];

  // Best-effort restaurant name from first line of raw_text
  const restaurantName =
    typedMenu.restaurant_name ??
    typedMenu.raw_text?.split('\n').find((line) => line.trim().length > 0)?.trim() ??
    'Menu';

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-10">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <SourceBadge sourceType={typedMenu.source_type} />
          </div>
          <h1 className="text-2xl font-bold text-brand-white mb-1">{restaurantName}</h1>
          <p className="text-brand-muted text-sm">
            {dishes.length} dish{dishes.length !== 1 ? 'es' : ''} found
          </p>
        </div>

        {/* Dish list */}
        {dishes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {dishes
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <DishCard key={item.id} item={item} />
              ))}
          </div>
        ) : (
          <div className="text-center py-16 text-brand-muted">
            <p className="text-4xl mb-4">🍽</p>
            <p className="text-sm">No dishes were extracted from this menu.</p>
          </div>
        )}

        {/* Footer note */}
        <p className="text-brand-muted/40 text-xs text-center mt-10">
          Dish data parsed by NOM AI — translations may vary
        </p>
      </div>
    </div>
  );
}
