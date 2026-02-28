-- =============================================================================
-- v1.2 Foundation migration: pgvector, unaccent, canonical name columns,
-- known_dishes table, HNSW indexes, match_dishes RPC, dish_names_hash
-- =============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 2. Add canonical name + enrichment columns to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS canonical_name        TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS canonical_confidence  FLOAT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS canonical_source      TEXT;          -- 'seed_match' | 'llm_generated'
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_beverage           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_status     TEXT    NOT NULL DEFAULT 'pending'; -- 'pending' | 'enriched' | 'skipped' | 'failed'
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS embedding             extensions.vector(1536);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS embedding_model       TEXT;          -- e.g. 'text-embedding-3-small'

-- 3. Add dish_names_hash to menus table for content-aware re-scan diff
ALTER TABLE menus ADD COLUMN IF NOT EXISTS dish_names_hash TEXT;                     -- SHA-256 of sorted dish names

-- 4. Create HNSW index on menu_items.embedding for semantic search
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
  ON menu_items USING hnsw (embedding extensions.vector_cosine_ops);

-- 5. Create partial index on enrichment_status for efficient queue polling
CREATE INDEX IF NOT EXISTS idx_menu_items_enrichment_pending
  ON menu_items (enrichment_status)
  WHERE enrichment_status = 'pending';

-- 6. Create known_dishes seed table
CREATE TABLE IF NOT EXISTS known_dishes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name   TEXT        NOT NULL UNIQUE,
  aliases          TEXT[]      NOT NULL DEFAULT '{}',
  cuisine          TEXT,
  is_beverage      BOOLEAN     NOT NULL DEFAULT FALSE,
  description_fr   TEXT,
  description_en   TEXT,
  embedding        extensions.vector(1536),
  embedding_model  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create HNSW index on known_dishes.embedding
CREATE INDEX IF NOT EXISTS idx_known_dishes_embedding
  ON known_dishes USING hnsw (embedding extensions.vector_cosine_ops);

-- 8. Create match_dishes RPC for semantic similarity search (Phase 14)
CREATE OR REPLACE FUNCTION match_dishes(
  query_embedding  extensions.vector(1536),
  match_threshold  FLOAT    DEFAULT 0.85,
  match_count      INT      DEFAULT 5
)
RETURNS TABLE (
  id              UUID,
  canonical_name  TEXT,
  aliases         TEXT[],
  cuisine         TEXT,
  similarity      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    canonical_name,
    aliases,
    cuisine,
    1 - (embedding <=> query_embedding) AS similarity
  FROM known_dishes
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
