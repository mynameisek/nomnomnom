// =============================================================================
// Canonical name generation — server-only, fire-and-forget
// =============================================================================
// Generates normalized canonical dish names via batch LLM call.
// Called inside after() — NEVER throws, NEVER blocks scan response.
// Pattern mirrors lib/google-places.ts: fire-and-forget, graceful error handling.
// =============================================================================

import 'server-only';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { canonicalBatchSchema } from './types/llm';
import { supabaseAdmin } from './supabase-admin';
import { getAdminConfig } from './cache';

// =============================================================================
// Canonical name normalization system prompt
// =============================================================================

const CANONICAL_NAME_PROMPT = `You are a culinary expert and food lexicographer specializing in canonical dish name normalization.

For each dish in the input array, return:
- index: same as input (for merging results)
- canonical_name: the standard international name in Latin script (or null if truly unidentifiable)
- confidence: 0.0–1.0 confidence score
- is_beverage: true if this is a drink, false if food or dessert

CANONICAL NAME RULES:
- Use the most widely recognized international form in Latin script
- Latin diacritics are allowed and preferred (Mantı, Börek, Tarte Flambée) — no Arabic, CJK, or Cyrillic script
- Use culinary standard names: "Mantı" not "Manti" or "Turkish Dumplings"
- If the dish name is already its canonical form, return it unchanged with high confidence
- Set canonical_name = null only if the dish is genuinely unidentifiable (e.g. random text)

CONFIDENCE SCALE:
- High (0.80–1.00): Certain — dish matches a well-known canonical form
- Medium (0.50–0.79): Probable — dish matches a known type but has variations
- Low (0.01–0.49): Uncertain — ambiguous name or regional variation with multiple possible identities

IS_BEVERAGE RULES:
- true: water, wine, beer, juice, coffee, tea, soda, cocktail, spirits, infusions, smoothies, soft drinks
- false: ALL food items AND desserts (desserts are food, not beverages)
- Use the category and subcategory fields to help determine — "Boissons" / "Drinks" sections are strong signals

Return ALL input dishes — do not omit any. Use the same index as input for merge.`;

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
// generateCanonicalNames — main export
// =============================================================================

/**
 * Generates canonical names for all menu_items in a menu that lack one.
 * Fire-and-forget: does not throw — logs errors and returns silently.
 * Called inside after() — must NEVER block the scan HTTP response.
 *
 * Flow:
 * 1. Fetch pending items (canonical_name IS NULL)
 * 2. Chunk into batches of 80 (prevents LLM timeout on large menus)
 * 3. For each chunk: call LLM with batch canonical name schema
 * 4. Upsert results back to menu_items
 *
 * @param menuId - The menu UUID whose items need canonical names
 */
export async function generateCanonicalNames(menuId: string): Promise<void> {
  try {
    // Step 1: Fetch pending items
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name_original, category, subcategory')
      .eq('menu_id', menuId)
      .is('canonical_name', null);

    if (fetchError) {
      console.error('[generateCanonicalNames] Failed to fetch pending items:', fetchError.message);
      return;
    }

    if (!items || items.length === 0) {
      console.log(`[generateCanonicalNames] No pending items for menu ${menuId} — skipping`);
      return;
    }

    console.log(`[generateCanonicalNames] Processing ${items.length} items for menu ${menuId}`);

    // Step 2: Read admin config for model selection
    const config = await getAdminConfig();

    // Step 3: Chunk into batches of 80 (Research Pitfall 2: LLM timeout on 200-dish menus)
    const CHUNK_SIZE = 80;
    const batches = chunk(items, CHUNK_SIZE);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchOffset = batchIdx * CHUNK_SIZE;

      // Map items to LLM input format with local index (for merge after LLM call)
      const dishList = batch.map((item, localIdx) => ({
        index: localIdx,
        name: item.name_original,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
      }));

      try {
        // Step 4: LLM call — batch canonical name generation
        const { experimental_output: output } = await generateText({
          model: openai(config.llm_model),
          output: Output.object({ schema: canonicalBatchSchema }),
          system: CANONICAL_NAME_PROMPT,
          messages: [
            {
              role: 'user',
              content: JSON.stringify({ dishes: dishList }),
            },
          ],
          maxRetries: 1,
        });

        if (!output?.dishes) {
          console.error(`[generateCanonicalNames] Batch ${batchIdx + 1}/${batches.length}: LLM returned no output`);
          continue;
        }

        // Step 5: Process results and build upsert payload
        const updates: Array<{
          id: string;
          canonical_name: string | null;
          canonical_confidence: number | null;
          canonical_source: string;
          is_beverage: boolean;
          enrichment_status: string;
        }> = [];

        for (const result of output.dishes) {
          const item = batch[result.index];
          if (!item) {
            console.warn(`[generateCanonicalNames] Batch ${batchIdx + 1}: Unknown index ${result.index} in LLM output`);
            continue;
          }

          // Determine enrichment_status based on confidence and beverage flag
          let enrichment_status: string;
          if (!result.canonical_name) {
            enrichment_status = 'failed';
          } else {
            // All items (food + beverages) go to 'pending' for Phase 11 enrichment
            // is_beverage flag signals Phase 11 to deprioritize, but never skip entirely
            enrichment_status = 'pending';
          }

          updates.push({
            id: item.id,
            canonical_name: result.canonical_name,
            canonical_confidence: result.confidence,
            canonical_source: 'llm_generated',
            is_beverage: result.is_beverage,
            enrichment_status,
          });
        }

        if (updates.length === 0) {
          console.warn(`[generateCanonicalNames] Batch ${batchIdx + 1}/${batches.length}: No valid results to upsert`);
          continue;
        }

        // Step 6: Update each item individually (upsert fails on NOT NULL columns)
        let updateCount = 0;
        for (const update of updates) {
          const { id, ...fields } = update;
          const { error: updateError } = await supabaseAdmin
            .from('menu_items')
            .update(fields)
            .eq('id', id);
          if (updateError) {
            console.error(`[generateCanonicalNames] Update failed for ${id}:`, updateError.message);
          } else {
            updateCount++;
          }
        }

        console.log(
          `[generateCanonicalNames] Batch ${batchIdx + 1}/${batches.length}: Updated ${updateCount} canonical names for menu ${menuId} (offset ${batchOffset})`
        );
      } catch (batchError) {
        // Catch per-batch errors — don't abort remaining batches
        console.error(
          `[generateCanonicalNames] Batch ${batchIdx + 1}/${batches.length} failed:`,
          batchError instanceof Error ? batchError.message : batchError
        );
      }
    }
  } catch (error) {
    // Top-level catch — NEVER throw from after() context
    console.error(
      '[generateCanonicalNames] Fatal error:',
      error instanceof Error ? error.message : error
    );
  }
}
