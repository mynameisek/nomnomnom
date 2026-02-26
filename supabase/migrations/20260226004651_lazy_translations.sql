-- =============================================================================
-- Migration: Lazy translations — allow partial/empty translations
-- =============================================================================
-- Context: Menu scanning now does parse-only (no translations). Translations
-- happen lazily when a user views the menu in their language.
-- This migration makes name_translations nullable with default '{}' so items
-- can be inserted without any translations.
-- Non-destructive: existing menus with full translations keep working.
-- =============================================================================

-- Allow partial translations (not all 4 langs required)
ALTER TABLE menu_items ALTER COLUMN name_translations SET DEFAULT '{}';
ALTER TABLE menu_items ALTER COLUMN name_translations DROP NOT NULL;

-- Add source_language to menus table (detected during parse)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT NULL;
