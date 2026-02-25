import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import type { MenuWithItems } from '@/lib/types/menu';
import MenuAccordion from '@/components/menu/MenuAccordion';

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

        {/* Accordion menu */}
        <MenuAccordion items={dishes} />

        {/* Footer */}
        <p className="text-brand-muted/40 text-xs text-center mt-10">
          Dish data parsed by NOM AI — translations may vary
        </p>
      </div>
    </div>
  );
}
