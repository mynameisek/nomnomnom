'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthenticated } from '@/lib/admin-session';

// =============================================================================
// Allowed LLM models — exported so AdminDashboard can build the dropdown
// =============================================================================

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

// =============================================================================
// saveAdminModel — Server Action: persist LLM model selection
// =============================================================================

/**
 * Updates the active LLM model in admin_config.
 *
 * Guards:
 * - isAdminAuthenticated() check — cannot be called without valid session
 * - Model must be in ALLOWED_MODELS — rejects arbitrary strings
 *
 * On success: revalidates /admin so the Server Component re-fetches currentModel.
 */
export async function saveAdminModel(
  model: string
): Promise<{ ok: true; model: string } | { error: string }> {
  // Auth guard — Server Actions are still callable directly, so we re-check
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { error: 'Unauthorized' };
  }

  // Validate against allowlist
  if (!(ALLOWED_MODELS as readonly string[]).includes(model)) {
    return { error: 'Invalid model' };
  }

  const { error } = await supabaseAdmin
    .from('admin_config')
    .update({ llm_model: model, updated_at: new Date().toISOString() })
    .eq('id', true);

  if (error) {
    return { error: error.message };
  }

  // Bust the /admin Server Component cache so the new model shows immediately
  revalidatePath('/admin');

  return { ok: true, model };
}
