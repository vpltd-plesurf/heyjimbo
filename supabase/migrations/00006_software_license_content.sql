-- Software license content table

CREATE TABLE IF NOT EXISTS software_license_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL DEFAULT '',
    license_to TEXT,
    email TEXT,
    purchase_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE software_license_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view software license content for their items"
    ON software_license_content FOR SELECT
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = software_license_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can create software license content for their items"
    ON software_license_content FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = software_license_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can update software license content for their items"
    ON software_license_content FOR UPDATE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = software_license_content.item_id AND items.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = software_license_content.item_id AND items.user_id = auth.uid()));

CREATE POLICY "Users can delete software license content for their items"
    ON software_license_content FOR DELETE
    USING (EXISTS (SELECT 1 FROM items WHERE items.id = software_license_content.item_id AND items.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_software_license_content_item_id ON software_license_content(item_id);

CREATE TRIGGER trigger_software_license_content_updated_at
    BEFORE UPDATE ON software_license_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
