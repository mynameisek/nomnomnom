-- =============================================================================
-- nomnomnom v1.1 Database Schema
-- Run this in Supabase SQL Editor: Project -> SQL Editor -> New query
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------------

-- EU 14 mandatory allergens (legally defined, stable list)
create type allergen_type as enum (
  'gluten',
  'dairy',
  'nuts',
  'peanuts',
  'soy',
  'eggs',
  'fish',
  'shellfish',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs'
);

-- Trust signal: was the allergen info extracted directly from menu text or inferred by LLM?
create type trust_signal_type as enum ('verified', 'inferred');

-- -----------------------------------------------------------------------------
-- menus table — one row per unique URL (cache entry)
-- -----------------------------------------------------------------------------

create table menus (
  id              uuid        primary key default gen_random_uuid(),
  url             text        not null,
  url_hash        text        not null unique,     -- SHA-256 hex (64 chars), cache key
  restaurant_name text,                             -- nullable — may not be extractable
  source_type     text,                             -- 'url' | 'photo' | 'qr'
  raw_text        text,                             -- original scraped/OCR text (debugging)
  parse_time_ms   integer,                          -- LLM parse duration in ms (null for cache hits / pre-parsed)
  hit_count       integer     not null default 0,   -- incremented on each cache hit
  category_translations jsonb  default '{}',       -- {"de":{"A BOIRE":"GETRÄNKE",...},...}
  google_place_id  text,                             -- Google Places ID for deduplication
  google_place_name text,                            -- display name from Google Places
  google_address   text,                             -- formatted address
  google_phone     text,                             -- national phone number
  google_rating    numeric(2,1),                     -- e.g. 4.3
  google_photo_ref text,                             -- Google Places photo resource name
  google_url       text,                             -- Google Maps URL
  parsed_at       timestamptz default now(),
  expires_at      timestamptz not null,             -- parsed_at + cache_ttl_hours from admin_config
  created_at      timestamptz default now()
);

-- Index for cache lookups by url_hash
create index idx_menus_url_hash on menus (url_hash);

-- Compound index to filter expired entries efficiently in cache check queries:
-- SELECT * FROM menus WHERE url_hash = $1 AND expires_at > NOW()
create index idx_menus_url_hash_expires on menus (url_hash, expires_at);

-- -----------------------------------------------------------------------------
-- menu_items table — one row per dish
-- -----------------------------------------------------------------------------

create table menu_items (
  id                       uuid             primary key default gen_random_uuid(),
  menu_id                  uuid             not null references menus(id) on delete cascade,
  name_original            text             not null,
  name_translations        jsonb            not null,    -- {"fr":"...","en":"...","tr":"...","de":"..."}
  description_original     text,                         -- nullable
  description_translations jsonb,                        -- same shape as name_translations, nullable
  price                    text,                         -- "12€", "8.50 TL", null if not found
  allergens                allergen_type[]  not null default '{}',
  dietary_tags             text[]           not null default '{}',  -- ['vegetarian','vegan','halal'] — text[] not enum (list may grow)
  trust_signal             trust_signal_type not null default 'inferred',
  category                 text,                                 -- top-level category (e.g. "Entrées", "Boissons")
  subcategory              text,                                 -- sub-category (e.g. "Bières", "Cocktails")
  sort_order               integer          not null default 0,  -- preserves original menu order
  created_at               timestamptz      default now()
);

-- Index for fast fetch of all items belonging to a menu
create index idx_menu_items_menu_id on menu_items (menu_id);

-- -----------------------------------------------------------------------------
-- admin_config table — single-row configuration (admin panel controlled)
-- -----------------------------------------------------------------------------

create table admin_config (
  id               boolean  primary key default true check (id = true),  -- enforces single row
  llm_model        text     not null default 'gpt-4o-mini',
  cache_ttl_hours  integer  not null default 168,  -- 7 days — admin configurable
  updated_at       timestamptz default now()
);

-- Seed default config row
insert into admin_config (llm_model, cache_ttl_hours) values ('gpt-4o-mini', 168);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------

-- menus: public reads — service role writes (service role bypasses RLS entirely)
alter table menus enable row level security;

create policy "Public can read menus"
  on menus for select
  to anon, authenticated
  using (true);

-- menu_items: public reads — service role writes
alter table menu_items enable row level security;

create policy "Public can read menu_items"
  on menu_items for select
  to anon, authenticated
  using (true);

-- admin_config: NO public policies — service role only
-- Service role bypasses RLS, so no INSERT/UPDATE policies needed.
-- anon and authenticated roles have no access.
alter table admin_config enable row level security;
