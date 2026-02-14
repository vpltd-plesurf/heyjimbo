-- Attachments table for file uploads linked to items

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their items"
    ON attachments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create attachments for their items"
    ON attachments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own attachments"
    ON attachments FOR DELETE
    USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_attachments_item_id ON attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their attachments"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
