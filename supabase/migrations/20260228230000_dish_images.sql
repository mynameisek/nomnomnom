-- =============================================================================
-- Phase 12: Dish Images — Add image columns to menu_items
-- =============================================================================
-- Adds 5 columns for storing licensed stock photo attribution data per dish.
-- Images are fetched asynchronously after enrichment completes (Unsplash → Pexels).
-- All columns are nullable — NULL means no image found (UI shows gradient+emoji).
-- =============================================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_source TEXT,
  ADD COLUMN IF NOT EXISTS image_credit TEXT,
  ADD COLUMN IF NOT EXISTS image_credit_url TEXT,
  ADD COLUMN IF NOT EXISTS image_placeholder TEXT;
