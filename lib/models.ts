// Shared LLM model constants — no 'use server' / 'use client' directive
// Safe to import from server actions and client components alike.

/**
 * Allowlist of LLM models available for admin selection.
 * Used by saveAdminModel (server action) for input validation
 * and AdminDashboard (client component) for the model selector dropdown.
 * Single source of truth — add/remove models here only.
 */
export const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

/**
 * Union type of all allowed model strings.
 * Derived from ALLOWED_MODELS — stays in sync automatically.
 * Use as the parameter type for saveAdminModel.
 */
export type AllowedModel = typeof ALLOWED_MODELS[number];
