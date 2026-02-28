// =============================================================================
// Dish enrichment — server-only, fire-and-forget
// =============================================================================
// Generates adaptive-depth cultural enrichment for food dishes via batch LLM call.
// Called inside after() chained after generateCanonicalNames — NEVER throws,
// NEVER blocks scan response. Beverages are marked 'skipped' immediately.
//
// Pattern mirrors lib/canonical.ts: fire-and-forget, graceful error handling.
// =============================================================================

import 'server-only';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { enrichmentBatchSchema } from './types/llm';
import { supabaseAdmin } from './supabase-admin';
import { getAdminConfig } from './cache';

// =============================================================================
// Enrichment system prompt — adaptive depth based on dish exoticism
// =============================================================================

const ENRICHMENT_SYSTEM_PROMPT = `You are a culinary cultural educator helping French diners understand unfamiliar dishes.

For each dish in the input array, determine the depth tier and return cultural enrichment data:

DEPTH ASSIGNMENT RULES:
- depth_tier = "full": foreign, exotic, or regional dishes that French diners likely do not know
  Examples: Mantı, Lahmacun, Börek, Tarte Flambée, Baeckeoffe, Okonomiyaki, Couscous, Mapo Tofu, Pad Thai, Bibimbap, Shawarma, Falafel
- depth_tier = "minimal": self-explanatory French or internationally familiar dishes
  Examples: steak frites, salade césar, croque-monsieur, poulet rôti, pâtes bolognaise, pizza margherita, burger, saumon grillé, tiramisu

FULL DEPTH FIELDS (depth_tier = "full"):
- origin: geographic/cultural origin, concise (e.g. "Anatolie centrale, Turquie")
- typical_ingredients: array of 3-6 key ingredients in French (e.g. ["agneau", "pâte fine", "oignon"])
- cultural_note: 1-2 sentences of cultural/historical context in French
- eating_tips: 1 sentence in French on how to eat it or what to expect

MINIMAL DEPTH FIELDS (depth_tier = "minimal"):
- origin: null
- typical_ingredients: array of 3-5 key ingredients in French
- cultural_note: null
- eating_tips: null

IMPORTANT:
- All text responses must be in French
- Use canonical_name if provided, otherwise use name
- Return ALL input dishes — do not omit any
- Use the same index as input for merging results`;

// =============================================================================
// Chunk helper — split array into batches of maxSize
// =============================================================================

function chunk<T>(arr: T[], maxSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

// =============================================================================
// enrichDishBatch — main export
// =============================================================================

/**
 * Generates adaptive-depth cultural enrichment for food dishes in a menu.
 * Fire-and-forget: does not throw — logs errors and returns silently.
 * Called inside after() chained after generateCanonicalNames.
 *
 * Flow:
 * 1. Fetch items with enrichment_status = 'pending'
 * 2. Mark beverages as 'skipped' immediately (critical: prevents polling hook stall)
 * 3. Filter to food items only
 * 4. Chunk at 40 (enrichment output is longer than canonical names)
 * 5. For each chunk: call LLM with batch enrichment schema
 * 6. Upsert results back to menu_items
 * 7. Items not returned by LLM: mark as 'failed'
 *
 * @param menuId - The menu UUID whose food items need enrichment
 */
export async function enrichDishBatch(menuId: string): Promise<void> {
  try {
    // Step 1: Fetch pending items
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('id, canonical_name, name_original, is_beverage, category, subcategory')
      .eq('menu_id', menuId)
      .eq('enrichment_status', 'pending');

    if (fetchError) {
      console.error('[enrichDishBatch] Failed to fetch pending items:', fetchError.message);
      return;
    }

    if (!items || items.length === 0) {
      console.log(`[enrichDishBatch] No pending items for menu ${menuId} — skipping`);
      return;
    }

    console.log(`[enrichDishBatch] Processing ${items.length} items for menu ${menuId}`);

    // Step 2: Mark beverages as 'skipped' immediately
    // CRITICAL: if beverages stay 'pending', the polling hook never resolves
    const beverages = items.filter(item => item.is_beverage);
    if (beverages.length > 0) {
      const { error: skipError } = await supabaseAdmin
        .from('menu_items')
        .upsert(
          beverages.map(b => ({ id: b.id, enrichment_status: 'skipped' })),
          { onConflict: 'id' }
        );
      if (skipError) {
        console.error('[enrichDishBatch] Failed to mark beverages as skipped:', skipError.message);
      } else {
        console.log(`[enrichDishBatch] Marked ${beverages.length} beverages as skipped for menu ${menuId}`);
      }
    }

    // Step 3: Filter to food items only
    const foodItems = items.filter(item => !item.is_beverage);
    if (foodItems.length === 0) {
      console.log(`[enrichDishBatch] No food items to enrich for menu ${menuId} — all beverages`);
      return;
    }

    console.log(`[enrichDishBatch] Enriching ${foodItems.length} food items for menu ${menuId}`);

    // Step 4: Read admin config for model selection
    const config = await getAdminConfig();

    // Chunk at 40 — enrichment output is longer than canonical names
    const CHUNK_SIZE = 40;
    const batches = chunk(foodItems, CHUNK_SIZE);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      // Build dish list for LLM input with local index for merge
      const dishList = batch.map((item, localIdx) => ({
        index: localIdx,
        name: item.name_original,
        canonical_name: item.canonical_name ?? null,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
      }));

      try {
        // Step 5: LLM call — batch cultural enrichment
        const { experimental_output: output } = await generateText({
          model: openai(config.llm_model),
          output: Output.object({ schema: enrichmentBatchSchema }),
          system: ENRICHMENT_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: JSON.stringify({ dishes: dishList }),
            },
          ],
          maxRetries: 1,
        });

        if (!output?.dishes) {
          console.error(`[enrichDishBatch] Batch ${batchIdx + 1}/${batches.length}: LLM returned no output`);
          // Mark batch items as failed
          await supabaseAdmin
            .from('menu_items')
            .upsert(
              batch.map(item => ({ id: item.id, enrichment_status: 'failed' })),
              { onConflict: 'id' }
            );
          continue;
        }

        // Step 6: Process results — build upsert payload
        const returnedIndexes = new Set(output.dishes.map(d => d.index));
        const updates: Array<Record<string, unknown>> = [];

        for (const result of output.dishes) {
          const item = batch[result.index];
          if (!item) {
            console.warn(`[enrichDishBatch] Batch ${batchIdx + 1}: Unknown index ${result.index} in LLM output`);
            continue;
          }

          updates.push({
            id: item.id,
            enrichment_origin: result.origin,
            enrichment_ingredients: result.typical_ingredients,
            enrichment_cultural_note: result.cultural_note,
            enrichment_eating_tips: result.eating_tips,
            enrichment_depth: result.depth_tier,
            enrichment_model: config.llm_model,
            enrichment_status: 'enriched',
            enriched_at: new Date().toISOString(),
          });
        }

        // Step 7: Upsert enriched items
        if (updates.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from('menu_items')
            .upsert(updates, { onConflict: 'id' });

          if (upsertError) {
            console.error(`[enrichDishBatch] Batch ${batchIdx + 1}/${batches.length}: Upsert failed:`, upsertError.message);
          } else {
            console.log(
              `[enrichDishBatch] Batch ${batchIdx + 1}/${batches.length}: Enriched ${updates.length} food items for menu ${menuId}`
            );
          }
        }

        // Step 8: Mark items not returned by LLM as failed
        const missingItems = batch.filter((_, idx) => !returnedIndexes.has(idx));
        if (missingItems.length > 0) {
          await supabaseAdmin
            .from('menu_items')
            .upsert(
              missingItems.map(item => ({ id: item.id, enrichment_status: 'failed' })),
              { onConflict: 'id' }
            );
          console.warn(`[enrichDishBatch] Batch ${batchIdx + 1}: Marked ${missingItems.length} items as failed (not returned by LLM)`);
        }
      } catch (batchError) {
        // Catch per-batch errors — don't abort remaining batches
        console.error(
          `[enrichDishBatch] Batch ${batchIdx + 1}/${batches.length} failed:`,
          batchError instanceof Error ? batchError.message : batchError
        );
        // Mark all batch items as failed so they don't stay 'pending'
        try {
          await supabaseAdmin
            .from('menu_items')
            .upsert(
              batch.map(item => ({ id: item.id, enrichment_status: 'failed' })),
              { onConflict: 'id' }
            );
        } catch {
          // Ignore secondary failure
        }
      }
    }
  } catch (error) {
    // Top-level catch — NEVER throw from after() context
    console.error(
      '[enrichDishBatch] Fatal error:',
      error instanceof Error ? error.message : error
    );
  }
}
