-- Encryption settings for client-side password encryption

CREATE TABLE IF NOT EXISTS encryption_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    salt TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE encryption_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own encryption settings"
    ON encryption_settings FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own encryption settings"
    ON encryption_settings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own encryption settings"
    ON encryption_settings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trigger_encryption_settings_updated_at
    BEFORE UPDATE ON encryption_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
