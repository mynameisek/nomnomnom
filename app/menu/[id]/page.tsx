import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import type { MenuWithItems } from '@/lib/types/menu';
import MenuShell from '@/components/menu/MenuShell';

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

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-xl mx-auto">
        <MenuShell menu={typedMenu} />
      </div>
    </div>
  );
}
