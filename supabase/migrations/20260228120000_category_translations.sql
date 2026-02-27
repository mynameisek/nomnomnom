-- Add category_translations JSONB to menus table
-- Structure: { "de": { "A BOIRE": "GETRÄNKE", ... }, "en": { ... } }
-- Stores translated category/subcategory labels per target language.
ALTER TABLE menus ADD COLUMN category_translations JSONB DEFAULT '{}';
