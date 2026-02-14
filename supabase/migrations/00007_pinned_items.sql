-- Add is_pinned column to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_items_is_pinned ON items(is_pinned) WHERE is_pinned = TRUE;
