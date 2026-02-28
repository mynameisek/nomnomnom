'use server';
import { isAdminAuthenticated } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enrichDishBatch } from '@/lib/enrichment';

// =============================================================================
// Enrichment reset payload — clears all enrichment fields back to pending
// =============================================================================

const ENRICHMENT_RESET = {
  enrichment_status: 'pending' as const,
  enrichment_origin: null,
  enrichment_ingredients: null,
  enrichment_cultural_note: null,
  enrichment_eating_tips: null,
  enrichment_depth: null,
  enrichment_model: null,
  enriched_at: null,
};

// =============================================================================
// regenerateDishEnrichment — re-enriches a single dish
// =============================================================================

/**
 * Resets a single dish's enrichment fields and re-runs enrichment synchronously.
 * Admin-only — returns { error: 'Unauthorized' } if not authenticated.
 * Does not use after() — feedback is immediate (Research Pitfall 5 recommendation).
 */
export async function regenerateDishEnrichment(
  dishId: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdminAuthenticated())) return { error: 'Unauthorized' };

  // Fetch the dish to get its menu_id
  const { data: item, error: fetchError } = await supabaseAdmin
    .from('menu_items')
    .select('menu_id')
    .eq('id', dishId)
    .single();

  if (fetchError || !item) {
    return { error: 'Dish not found' };
  }

  // Reset enrichment fields to pending
  const { error: resetError } = await supabaseAdmin
    .from('menu_items')
    .update({ ...ENRICHMENT_RESET, id: dishId })
    .eq('id', dishId);

  if (resetError) {
    return { error: `Failed to reset enrichment: ${resetError.message}` };
  }

  // Re-run enrichment synchronously
  await enrichDishBatch(item.menu_id);

  return { ok: true };
}

// =============================================================================
// regenerateMenuEnrichment — re-enriches all food dishes in a menu
// =============================================================================

/**
 * Resets all food dishes in a menu and re-runs enrichment synchronously.
 * Admin-only — returns { error: 'Unauthorized' } if not authenticated.
 * Safety cap: max 80 food items (Vercel Pro 60s timeout).
 */
export async function regenerateMenuEnrichment(
  menuId: string
): Promise<{ ok: true; count: number } | { error: string }> {
  if (!(await isAdminAuthenticated())) return { error: 'Unauthorized' };

  // Fetch all food items for count check
  const { data: foodItems, error: countError } = await supabaseAdmin
    .from('menu_items')
    .select('id')
    .eq('menu_id', menuId)
    .eq('is_beverage', false);

  if (countError) {
    return { error: `Failed to fetch menu items: ${countError.message}` };
  }

  const count = foodItems?.length ?? 0;

  // Safety cap: 80 food items max (prevents Vercel 60s timeout on Vercel Pro)
  if (count > 80) {
    return { error: 'Menu too large for synchronous regen — max 80 food items' };
  }

  // Reset all food items' enrichment fields
  const { data: resetData, error: resetError } = await supabaseAdmin
    .from('menu_items')
    .update(ENRICHMENT_RESET)
    .eq('menu_id', menuId)
    .eq('is_beverage', false)
    .select('id');

  if (resetError) {
    return { error: `Failed to reset enrichment: ${resetError.message}` };
  }

  // Re-run enrichment synchronously for the entire menu
  await enrichDishBatch(menuId);

  return { ok: true, count: resetData?.length ?? 0 };
}
