-- Additional content tables for non-note item types

-- ============================================================================
-- BOOKMARK_CONTENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookmark_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    url TEXT NOT NULL DEFAULT '',
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PASSWORD_CONTENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    location TEXT NOT NULL DEFAULT '',
    account TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SERIAL_NUMBER_CONTENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS serial_number_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL DEFAULT '',
    owner_name TEXT,
    owner_email TEXT,
    organization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE bookmark_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_number_content ENABLE ROW LEVEL SECURITY;

-- Bookmark content policies
CREATE POLICY "Users can view bookmark content for their items"
    ON bookmark_content FOR SELECT
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = bookmark_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can create bookmark content for their items"
    ON bookmark_content FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = bookmark_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can update bookmark content for their items"
    ON bookmark_content FOR UPDATE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = bookmark_content.item_id AND items.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = bookmark_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can delete bookmark content for their items"
    ON bookmark_content FOR DELETE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = bookmark_content.item_id AND items.user_id = auth.uid()));

-- Password content policies
CREATE POLICY "Users can view password content for their items"
    ON password_content FOR SELECT
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = password_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can create password content for their items"
    ON password_content FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = password_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can update password content for their items"
    ON password_content FOR UPDATE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = password_content.item_id AND items.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = password_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can delete password content for their items"
    ON password_content FOR DELETE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = password_content.item_id AND items.user_id = auth.uid()));

-- Serial number content policies
CREATE POLICY "Users can view serial number content for their items"
    ON serial_number_content FOR SELECT
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = serial_number_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can create serial number content for their items"
    ON serial_number_content FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = serial_number_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can update serial number content for their items"
    ON serial_number_content FOR UPDATE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = serial_number_content.item_id AND items.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = serial_number_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can delete serial number content for their items"
    ON serial_number_content FOR DELETE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = serial_number_content.item_id AND items.user_id = auth.uid()));

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bookmark_content_item_id ON bookmark_content(item_id);
CREATE INDEX IF NOT EXISTS idx_password_content_item_id ON password_content(item_id);
CREATE INDEX IF NOT EXISTS idx_serial_number_content_item_id ON serial_number_content(item_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER trigger_bookmark_content_updated_at
    BEFORE UPDATE ON bookmark_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_password_content_updated_at
    BEFORE UPDATE ON password_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_serial_number_content_updated_at
    BEFORE UPDATE ON serial_number_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
