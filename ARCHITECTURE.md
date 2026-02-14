# HeyJimbo Architecture

This document describes the architecture of HeyJimbo, a web-based personal information organizer.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **State Management**: React hooks (useState, useEffect, useCallback)

## Project Structure

```
heyjimbo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth route group (login, register)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── api/                # API routes
│   │   │   ├── auth/callback/  # OAuth callback handler
│   │   │   └── items/          # Items CRUD endpoints
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root page (redirects)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── auth/               # Authentication forms
│   │   ├── layout/             # Three-column layout components
│   │   └── ui/                 # Reusable UI components
│   ├── hooks/
│   │   └── use-items.ts        # Items CRUD hook
│   └── lib/
│       ├── supabase/           # Supabase client configurations
│       └── utils/              # Utility functions
├── supabase/
│   └── migrations/             # Database migrations
├── middleware.ts               # Auth middleware (route protection)
└── .env.local                  # Environment variables
```

## Database Schema

### Tables

1. **items** - Main content table
   - `id`: UUID primary key
   - `user_id`: References auth.users
   - `name`: Item title
   - `type`: note | bookmark | password | serial_number | software_license | folder
   - `is_flagged`: Boolean flag
   - `is_trashed`: Boolean for soft delete
   - `parent_folder_id`: For folder organization
   - `search_vector`: Full-text search index

2. **note_content** - Note-specific content
   - `id`: UUID primary key
   - `item_id`: References items (1:1)
   - `content`: Text content
   - `content_format`: plain | markdown | html

3. **labels** - User tags/labels
   - `id`: UUID primary key
   - `user_id`: References auth.users
   - `name`: Label name
   - `color`: Hex color code

4. **item_labels** - Many-to-many junction table

5. **encryption_keys** - For future client-side encryption

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:
- `auth.uid() = user_id` for direct ownership
- Subqueries for related data (note_content, item_labels)

## Authentication Flow

1. **Registration**: User submits email/password → Supabase creates user → Email verification sent
2. **Login**: Email/password → Supabase validates → Session cookie set
3. **Session**: Middleware refreshes session on each request
4. **Protection**: Middleware redirects unauthenticated users from protected routes

## API Routes

### `/api/items`
- **GET**: List items with filters (type, flagged, trashed, search)
- **POST**: Create new item with optional note content

### `/api/items/[id]`
- **GET**: Get single item with note content
- **PUT**: Update item fields and/or note content
- **DELETE**: Permanently delete item

## UI Architecture

### Three-Column Layout

1. **Sidebar** (224px): Navigation filters, new item button, sign out
2. **Item List** (288px): Searchable list of items, sorted by updated_at
3. **Item Detail** (flexible): Edit view with auto-save

### Component Hierarchy

```
ThreeColumnLayout
├── Sidebar
│   └── Filter buttons, New item, Sign out
├── ItemList
│   └── Search input, Item cards
└── ItemDetail
    └── Title input, Content textarea, Action buttons
```

### State Management

- `useItems` hook: Manages items array, loading state, CRUD operations
- Local state in `ItemDetail`: Manages form state with auto-save debounce

## Data Flow

1. User action (click, type)
2. Component handler updates local state
3. After debounce/blur, API request sent
4. Server validates user ownership via RLS
5. Response updates hook state
6. React re-renders affected components

## Security Measures

1. **Authentication**: Supabase Auth with secure session cookies
2. **Authorization**: Row Level Security on all tables
3. **API Protection**: Middleware blocks unauthenticated API requests
4. **Input Validation**: Server-side validation before database operations

## Future Considerations

- **Encryption**: `encryption_keys` table ready for client-side encryption
- **Folders**: `parent_folder_id` supports nested organization
- **Other Types**: Schema supports bookmarks, passwords, etc. (UI not yet implemented)
- **Labels**: Many-to-many labels ready (UI not yet implemented)
