// =============================================================================
// GET /api/enrichment/status — Enrichment status polling endpoint
// =============================================================================
// Returns per-item enrichment status and enrichment data for food items.
// Used by the UI for progressive polling after menu scan completes.
//
// Uses the anon Supabase client — enrichment fields contain no PII.
// Filters to is_beverage = false: beverages are 'skipped' and irrelevant to UI.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // anon client — NOT supabaseAdmin (no PII)

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get('menuId');
  if (!menuId) return NextResponse.json({ error: 'Missing menuId' }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_items')
    .select(
      'id, name_original, enrichment_status, enrichment_origin, enrichment_ingredients, enrichment_cultural_note, enrichment_eating_tips, enrichment_depth'
    )
    .eq('menu_id', menuId)
    .eq('is_beverage', false); // food items only — beverages are 'skipped' and don't need polling

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
