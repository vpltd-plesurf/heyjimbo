-- Extend search vectors to index content from all item types

-- Update note search vector to strip HTML tags
CREATE OR REPLACE FUNCTION update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english',
        COALESCE(items.name, '') || ' ' ||
        COALESCE(regexp_replace(NEW.content, '<[^>]*>', ' ', 'g'), '')
    )
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bookmark content search vector
CREATE OR REPLACE FUNCTION update_bookmark_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english',
        COALESCE(items.name, '') || ' ' || COALESCE(NEW.url, '') || ' ' || COALESCE(NEW.source_url, '')
    )
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookmark_content_search_vector
    AFTER INSERT OR UPDATE OF url, source_url ON bookmark_content
    FOR EACH ROW
    EXECUTE FUNCTION update_bookmark_search_vector();

-- Password content search vector
CREATE OR REPLACE FUNCTION update_password_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english',
        COALESCE(items.name, '') || ' ' || COALESCE(NEW.location, '') || ' ' || COALESCE(NEW.account, '')
    )
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_password_content_search_vector
    AFTER INSERT OR UPDATE OF location, account ON password_content
    FOR EACH ROW
    EXECUTE FUNCTION update_password_search_vector();

-- Serial number content search vector
CREATE OR REPLACE FUNCTION update_serial_number_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english',
        COALESCE(items.name, '') || ' ' || COALESCE(NEW.serial_number, '') || ' ' ||
        COALESCE(NEW.owner_name, '') || ' ' || COALESCE(NEW.organization, '')
    )
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_serial_number_content_search_vector
    AFTER INSERT OR UPDATE OF serial_number, owner_name, organization ON serial_number_content
    FOR EACH ROW
    EXECUTE FUNCTION update_serial_number_search_vector();

-- Software license content search vector
CREATE OR REPLACE FUNCTION update_software_license_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET search_vector = to_tsvector('english',
        COALESCE(items.name, '') || ' ' || COALESCE(NEW.license_key, '') || ' ' ||
        COALESCE(NEW.license_to, '') || ' ' || COALESCE(NEW.notes, '')
    )
    WHERE items.id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_software_license_content_search_vector
    AFTER INSERT OR UPDATE OF license_key, license_to, notes ON software_license_content
    FOR EACH ROW
    EXECUTE FUNCTION update_software_license_search_vector();

-- Backfill: rebuild search vectors for all existing items
UPDATE items SET name = name;
