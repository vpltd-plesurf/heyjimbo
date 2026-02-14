-- HeyJimbo Initial Schema
-- This migration creates the core tables for the personal information organizer

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ITEMS TABLE (Main content table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL DEFAULT 'Untitled',
    type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'bookmark', 'password', 'serial_number', 'software_license', 'folder')),

    -- Status flags
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,

    -- Organization
    parent_folder_id UUID REFERENCES items(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trashed_at TIMESTAMPTZ,

    -- Full-text search
    search_vector TSVECTOR
);

-- ============================================================================
-- NOTE_CONTENT TABLE (Note-specific content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS note_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL DEFAULT '',
    content_format TEXT NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('plain', 'markdown', 'html')),

    -- Encrypted content (for future use)
    encrypted_content TEXT,
    encryption_iv TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LABELS TABLE (Tags/Labels)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Label info
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique label names per user
    CONSTRAINT unique_label_name_per_user UNIQUE (user_id, name)
);

-- ============================================================================
-- ITEM_LABELS TABLE (Many-to-many relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate label assignments
    CONSTRAINT unique_item_label UNIQUE (item_id, label_id)
);

-- ============================================================================
-- ENCRYPTION_KEYS TABLE (For future client-side encryption)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Key info (encrypted with user's password-derived key)
    encrypted_key TEXT NOT NULL,
    key_salt TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_is_flagged ON items(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_items_is_trashed ON items(is_trashed);
CREATE INDEX IF NOT EXISTS idx_items_parent_folder ON items(parent_folder_id) WHERE parent_folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_search_vector ON items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);

-- Note content indexes
CREATE INDEX IF NOT EXISTS idx_note_content_item_id ON note_content(item_id);

-- Labels indexes
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);

-- Item labels indexes
CREATE INDEX IF NOT EXISTS idx_item_labels_item_id ON item_labels(item_id);
CREATE INDEX IF NOT EXISTS idx_item_labels_label_id ON item_labels(label_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_item_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english', COALESCE(NEW.name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector with note content
CREATE OR REPLACE FUNCTION update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english', COALESCE(items.name, '') || ' ' || COALESCE(NEW.content, ''))
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_note_content_updated_at
    BEFORE UPDATE ON note_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_labels_updated_at
    BEFORE UPDATE ON labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers for search vector
CREATE TRIGGER trigger_items_search_vector
    BEFORE INSERT OR UPDATE OF name ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_item_search_vector();

CREATE TRIGGER trigger_note_content_search_vector
    AFTER INSERT OR UPDATE OF content ON note_content
    FOR EACH ROW
    EXECUTE FUNCTION update_note_search_vector();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view their own items"
    ON items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own items"
    ON items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
    ON items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
    ON items FOR DELETE
    USING (auth.uid() = user_id);

-- Note content policies (access through items)
CREATE POLICY "Users can view note content for their items"
    ON note_content FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM items WHERE items.id = note_content.item_id AND items.user_id = auth.uid()
    ));

CREATE POLICY "Users can create note content for their items"
    ON note_content FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM items WHERE items.id = note_content.item_id AND items.user_id = auth.uid()
    ));

CREATE POLICY "Users can update note content for their items"
    ON note_content FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM items WHERE items.id = note_content.item_id AND items.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM items WHERE items.id = note_content.item_id AND items.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete note content for their items"
    ON note_content FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM items WHERE items.id = note_content.item_id AND items.user_id = auth.uid()
    ));

-- Labels policies
CREATE POLICY "Users can view their own labels"
    ON labels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
    ON labels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
    ON labels FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labels"
    ON labels FOR DELETE
    USING (auth.uid() = user_id);

-- Item labels policies
CREATE POLICY "Users can view labels on their items"
    ON item_labels FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM items WHERE items.id = item_labels.item_id AND items.user_id = auth.uid()
    ));

CREATE POLICY "Users can add labels to their items"
    ON item_labels FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM items WHERE items.id = item_labels.item_id AND items.user_id = auth.uid()
    ));

CREATE POLICY "Users can remove labels from their items"
    ON item_labels FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM items WHERE items.id = item_labels.item_id AND items.user_id = auth.uid()
    ));

-- Encryption keys policies
CREATE POLICY "Users can view their own encryption key"
    ON encryption_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own encryption key"
    ON encryption_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption key"
    ON encryption_keys FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own encryption key"
    ON encryption_keys FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- DEFAULT LABELS FUNCTION
-- ============================================================================

-- Function to create default labels for new users
CREATE OR REPLACE FUNCTION create_default_labels()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO labels (user_id, name, color) VALUES
        (NEW.id, 'Personal', '#3b82f6'),
        (NEW.id, 'Work', '#10b981'),
        (NEW.id, 'Important', '#ef4444');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default labels when a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_labels();
