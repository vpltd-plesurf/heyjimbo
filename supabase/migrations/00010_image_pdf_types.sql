-- Expand item type constraint to include image, pdf, web_archive
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check
  CHECK (type IN ('note', 'bookmark', 'password', 'serial_number', 'software_license', 'folder', 'image', 'pdf', 'web_archive'));
