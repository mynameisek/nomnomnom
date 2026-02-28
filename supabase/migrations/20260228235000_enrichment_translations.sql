-- Add enrichment_translations JSONB column
-- Stores translated enrichment fields per language:
-- { "en": { "origin": "...", "cultural_note": "...", "eating_tips": "...", "ingredients": ["..."] } }
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_translations JSONB DEFAULT '{}';
