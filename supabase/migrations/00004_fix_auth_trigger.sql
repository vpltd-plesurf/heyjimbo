-- Remove the trigger on auth.users that causes "Database error saving new user"
-- Default labels will be created at the application level instead

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_labels();
