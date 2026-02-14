# HeyJimbo - Application Specification

## Overview

HeyJimbo is a web-based personal information organizer inspired by Bare Bones Software's Yojimbo. It provides secure storage, organization, and retrieval of various content types including notes, bookmarks, images, PDFs, passwords, serial numbers, and web archives.

**Key differentiator**: Full import capability for existing Yojimbo backups, ensuring users can migrate their data seamlessly.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email/password) |
| File Storage | Supabase Storage |
| Real-time Sync | Supabase Realtime |
| Deployment | Vercel |
| Repository | GitHub (vpltd-plesurf) |

---

## Features

### Core Features (Yojimbo Parity)

#### 1. Item Types

| Type | Description | Fields |
|------|-------------|--------|
| **Note** | Rich text notes | name, content (rich text), comments |
| **Bookmark** | Web URLs | name, url, source_url, comments |
| **Image** | Image files | name, file (PNG/JPG/GIF/WebP), image_type, comments |
| **PDF** | PDF documents | name, file, comments |
| **Password** | Secure credentials | name, location, account, password (encrypted), comments |
| **Serial Number** | Software licenses | name, serial_number, activation_key, owner_name, owner_email, organization, comments |
| **Web Archive** | Saved web pages | name, archive_data, source_url, comments |

#### 2. Organization

- **Tags**: Flexible tagging system with multi-tag support per item
- **Labels**: Color-coded labels (To Do, Work, Personal, Shopping, Travel, Music, News, custom)
- **Collections**:
  - Folder collections (manual organization)
  - Smart collections (dynamic, predicate-based filtering)
- **Flagging**: Mark important items for quick access
- **Trash**: Soft delete with restore capability

#### 3. Search & Browse

- **Full-text search**: Instant search across all content
- **Filter by type**: View items by content type
- **Filter by tag/label**: Narrow down by organization
- **Sort options**: By name, date created, date modified, date viewed
- **Recent items**: Quick access to recently viewed/modified

#### 4. Security

- **Item-level encryption**: AES-256 encryption for sensitive items
- **Master password**: Optional encryption key protected by user password
- **Secure password storage**: All Password items encrypted at rest
- **Row-level security**: Supabase RLS ensures users only access their own data

#### 5. Sync & Access

- **Real-time sync**: Changes propagate instantly across devices via Supabase Realtime
- **Multi-device access**: Access from any browser on any device
- **Offline support**: PWA with offline viewing (future enhancement)

### Import Features

#### Yojimbo Backup Import

Full support for importing Yojimbo `.zip` backup files:

1. **Upload backup**: User uploads their Yojimbo backup ZIP
2. **Parse structure**: Extract and parse:
   - `Database.bbyojimbostorage/Contents/Database/Database.sqlite`
   - `_EXTERNAL_DATA/` folder for large files
3. **Decrypt content**: Prompt for Yojimbo password to decrypt encrypted items
4. **Convert formats**:
   - NSKeyedArchiver bplist blobs → structured data
   - NSAttributedString → HTML/Markdown
   - Apple timestamps → ISO 8601
5. **Preserve metadata**: Tags, labels, collections, dates, flags

**Technical Details from Analysis**:

```
Database Tables:
- ZITEM: Main items table
- ZBLOB: Binary content (bplist with 0x01 prefix)
- ZBLOBSTRINGREP: Plaintext searchable content
- ZTAG: Tag definitions
- ZCOLLECTION: Collection definitions
- ZLABEL: Label definitions (with color data)
- ZENCRYPTIONKEY: Encryption key metadata
- Z_15TAGS: Item-tag junction table
- Z_15FOLDERCOLLECTIONS: Item-collection junction table

Entity Types (Z_ENT):
- 17: ImageArchive
- 18: Note
- 19: PDFArchive
- 20: WebArchive
- 21: Password
- 22: SerialNumber
- 23: WebBookmark

Date Format: Apple Core Data (seconds since 2001-01-01)
Encryption: AES-256-CBC with encrypted key in ZENCRYPTIONKEY
```

---

## Database Schema (Supabase)

### Tables

```sql
-- Users (handled by Supabase Auth)

-- Items table (main content)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'bookmark', 'image', 'pdf', 'password', 'serial_number', 'web_archive')),
  name TEXT NOT NULL,
  comments TEXT,

  -- Common metadata
  flagged BOOLEAN DEFAULT false,
  in_trash BOOLEAN DEFAULT false,
  label_id UUID REFERENCES labels(id),
  encrypted BOOLEAN DEFAULT false,
  encryption_key_id UUID REFERENCES encryption_keys(id),

  -- Dates
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  trashed_at TIMESTAMPTZ,

  -- Import tracking
  yojimbo_uuid TEXT, -- Original Yojimbo UUID for deduplication

  UNIQUE(user_id, yojimbo_uuid)
);

-- Note content
CREATE TABLE note_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  content TEXT, -- HTML or Markdown
  content_plain TEXT, -- Plaintext for search
  content_encrypted BYTEA -- If encrypted
);

-- Bookmark content
CREATE TABLE bookmark_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_url TEXT
);

-- Image content
CREATE TABLE image_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Supabase Storage path
  image_type TEXT, -- PNG, JPG, etc.
  thumbnail_path TEXT
);

-- PDF content
CREATE TABLE pdf_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  page_count INTEGER,
  text_content TEXT -- Extracted for search
);

-- Password content
CREATE TABLE password_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  location TEXT,
  account TEXT,
  password_encrypted BYTEA NOT NULL
);

-- Serial number content
CREATE TABLE serial_number_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  serial_number TEXT,
  activation_key TEXT,
  owner_name TEXT,
  owner_email TEXT,
  organization TEXT
);

-- Web archive content
CREATE TABLE web_archive_content (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Stored in Supabase Storage
  source_url TEXT
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  yojimbo_uuid TEXT,
  UNIQUE(user_id, name)
);

-- Item-Tag junction
CREATE TABLE item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Labels
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color
  display_order INTEGER DEFAULT 0,
  yojimbo_uuid TEXT,
  UNIQUE(user_id, name)
);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'smart')),
  predicate JSONB, -- For smart collections
  icon_data BYTEA,
  hidden BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  yojimbo_uuid TEXT
);

-- Item-Collection junction (for folder collections)
CREATE TABLE item_collections (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, collection_id)
);

-- Encryption keys
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  encrypted_key BYTEA NOT NULL, -- Key encrypted with user's master password
  password_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index
CREATE INDEX items_search_idx ON items USING gin(to_tsvector('english', name || ' ' || COALESCE(comments, '')));
CREATE INDEX note_content_search_idx ON note_content USING gin(to_tsvector('english', COALESCE(content_plain, '')));
```

### Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- Policy: Users can only access their own data
CREATE POLICY "Users can access own items" ON items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);
-- ... (similar for all tables)
```

---

## UI/UX Design

### Layout

```
+------------------+------------------------+-------------------+
|     Sidebar      |      Item List         |   Item Detail     |
|                  |                        |                   |
|  [Library]       |  [Search Bar]          |   [Item Title]    |
|  [Tags]          |  +-------------+       |   [Type Badge]    |
|    - Tag 1       |  | Item 1      |       |                   |
|    - Tag 2       |  | Item 2      |  -->  |   [Content]       |
|  [Labels]        |  | Item 3      |       |                   |
|    - Work        |  | ...         |       |   [Tags]          |
|    - Personal    |  +-------------+       |   [Metadata]      |
|  [Collections]   |                        |                   |
|  [Trash]         |  [Sort] [Filter]       |   [Edit] [Delete] |
+------------------+------------------------+-------------------+
```

### Key Views

1. **Library View**: All items (default)
2. **Type Views**: Filter by item type
3. **Tag View**: Items with specific tag
4. **Label View**: Items with specific label
5. **Collection View**: Items in collection
6. **Flagged View**: All flagged items
7. **Trash View**: Deleted items
8. **Search Results**: Full-text search results

### Item Editor

- **Note**: Rich text editor (TipTap or similar)
- **Bookmark**: URL input with favicon preview
- **Image**: Drag-drop upload, preview
- **PDF**: Upload, page preview
- **Password**: Secure input fields, show/hide toggle, generator
- **Serial Number**: Form with all fields
- **Web Archive**: URL input → fetch and archive

### Responsive Design

- Desktop: Three-column layout
- Tablet: Two-column (collapsible sidebar)
- Mobile: Single column with navigation

---

## API Routes (Next.js App Router)

```
/api/
├── auth/
│   ├── login          POST - Email/password login
│   ├── register       POST - Create account
│   ├── logout         POST - Sign out
│   └── reset-password POST - Password reset
├── items/
│   ├── [id]           GET, PUT, DELETE - Single item
│   ├── search         GET - Full-text search
│   └── bulk           POST, DELETE - Bulk operations
├── tags/
│   └── [id]           GET, POST, PUT, DELETE
├── labels/
│   └── [id]           GET, POST, PUT, DELETE
├── collections/
│   └── [id]           GET, POST, PUT, DELETE
├── import/
│   ├── yojimbo        POST - Upload and import Yojimbo backup
│   └── status/[id]    GET - Import progress
└── export/
    └── all            GET - Export all data
```

---

## Import Process Flow

```
1. User uploads Yojimbo backup ZIP
   ↓
2. Server extracts ZIP to temp directory
   ↓
3. Parse Database.sqlite:
   - Read ZITEM for items
   - Read ZBLOB for content
   - Read ZTAG, ZLABEL, ZCOLLECTION
   - Read Z_15TAGS, Z_15FOLDERCOLLECTIONS for relationships
   ↓
4. Check for encrypted items:
   - If found, prompt for Yojimbo password
   - Decrypt ZENCRYPTIONKEY.ZENCRYPTEDKEY
   - Use decrypted key to decrypt item content
   ↓
5. Convert each item:
   - Strip 0x01 prefix from blob
   - Parse NSKeyedArchiver bplist
   - Extract NSAttributedString → HTML
   - Convert Apple timestamps → ISO 8601
   ↓
6. Import to Supabase:
   - Create tags, labels, collections first
   - Create items with content
   - Link items to tags/collections
   - Upload files to Supabase Storage
   ↓
7. Return import summary:
   - Items imported by type
   - Skipped items (if any)
   - Errors (if any)
```

---

## Security Considerations

1. **Encryption at rest**: Sensitive items encrypted before storage
2. **Encryption in transit**: HTTPS everywhere
3. **Password hashing**: Handled by Supabase Auth (bcrypt)
4. **Item encryption**: AES-256-GCM for Password items
5. **Master password**: Optional, stored nowhere (derived for decryption)
6. **RLS policies**: Database-level access control
7. **Input validation**: Sanitize all user input
8. **CSRF protection**: Next.js built-in
9. **Rate limiting**: Supabase and Vercel built-in

---

## Development Phases

### Phase 1: Foundation
- [ ] Project setup (Next.js, Tailwind, Supabase)
- [ ] Authentication (sign up, login, logout)
- [ ] Basic database schema
- [ ] Note CRUD operations
- [ ] Basic UI layout

### Phase 2: Core Item Types
- [ ] Bookmark support
- [ ] Image support (with Supabase Storage)
- [ ] PDF support
- [ ] Password support (with encryption)
- [ ] Serial Number support
- [ ] Web Archive support

### Phase 3: Organization
- [ ] Tags system
- [ ] Labels system
- [ ] Folder collections
- [ ] Smart collections
- [ ] Flagging
- [ ] Trash/restore

### Phase 4: Search & Polish
- [ ] Full-text search
- [ ] Advanced filtering
- [ ] Sort options
- [ ] Responsive design
- [ ] Keyboard shortcuts

### Phase 5: Import/Export
- [ ] Yojimbo backup import
- [ ] Encrypted item decryption
- [ ] Export functionality
- [ ] Import progress tracking

### Phase 6: Advanced Features
- [ ] Real-time sync
- [ ] Offline support (PWA)
- [ ] Browser extension (bookmarklet)
- [ ] Quick input panel

---

## File Structure

```
heyjimbo/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx              # Library view
│   │   ├── items/[id]/page.tsx   # Item detail
│   │   ├── tags/[id]/page.tsx    # Tag view
│   │   ├── collections/[id]/page.tsx
│   │   ├── trash/page.tsx
│   │   ├── import/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── items/route.ts
│   │   ├── tags/route.ts
│   │   ├── import/yojimbo/route.ts
│   │   └── ...
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── items/                    # Item type components
│   ├── sidebar/
│   ├── editor/
│   └── import/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── import/
│   │   ├── yojimbo-parser.ts
│   │   ├── plist-decoder.ts
│   │   └── crypto.ts
│   └── utils/
├── hooks/
├── types/
├── public/
├── supabase/
│   └── migrations/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── specification.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "@tiptap/react": "^2.0.0",
    "plist": "^3.1.0",
    "jszip": "^3.10.0",
    "sql.js": "^1.9.0",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.0"
  }
}
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
ENCRYPTION_SECRET=
```

---

## References

- [Bare Bones Software - Yojimbo](https://www.barebones.com/products/yojimbo/)
- [Yojimbo Wikipedia](https://en.wikipedia.org/wiki/Yojimbo_(software))
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Apple plist Format](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/PropertyLists/)
