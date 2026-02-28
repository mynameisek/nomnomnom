-- Add Google Places enrichment columns to menus table
ALTER TABLE menus ADD COLUMN google_place_id TEXT;
ALTER TABLE menus ADD COLUMN google_place_name TEXT;
ALTER TABLE menus ADD COLUMN google_address TEXT;
ALTER TABLE menus ADD COLUMN google_phone TEXT;
ALTER TABLE menus ADD COLUMN google_rating NUMERIC(2,1);
ALTER TABLE menus ADD COLUMN google_photo_ref TEXT;
ALTER TABLE menus ADD COLUMN google_url TEXT;
