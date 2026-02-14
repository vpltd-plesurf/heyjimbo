-- Activity log for tracking user actions
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    item_name TEXT,
    item_type TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
    ON activity_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
    ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_log_user_created ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_item ON activity_log(item_id) WHERE item_id IS NOT NULL;
