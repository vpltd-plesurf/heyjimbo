# HeyJimbo - Project TODO

## Phase 1: Foundation (COMPLETED)

### Project Setup
- [x] Create Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Configure ESLint
- [x] Set up App Router with src directory
- [x] Install dependencies (Supabase, lucide-react, date-fns, zod, clsx, tailwind-merge)

### Environment & Configuration
- [x] Create `.env.local.example` with placeholder values
- [x] Create `.env.local` with placeholder values
- [x] Configure `next.config.mjs`
- [x] Configure `tailwind.config.ts`

### Database Schema
- [x] Create `supabase/migrations/00001_initial_schema.sql`
- [x] Define `items` table with RLS
- [x] Define `note_content` table with RLS
- [x] Define `labels` table with RLS
- [x] Define `item_labels` junction table
- [x] Define `encryption_keys` table (future use)
- [x] Create indexes for performance
- [x] Create triggers for updated_at and search_vector
- [x] Create default labels function for new users

### Supabase Integration
- [x] Create browser client (`src/lib/supabase/client.ts`)
- [x] Create server client (`src/lib/supabase/server.ts`)
- [x] Create auth middleware (`src/middleware.ts`)

### Authentication
- [x] Create auth layout (`src/app/(auth)/layout.tsx`)
- [x] Create login page (`src/app/(auth)/login/page.tsx`)
- [x] Create register page (`src/app/(auth)/register/page.tsx`)
- [x] Create login form component (`src/components/auth/login-form.tsx`)
- [x] Create register form component (`src/components/auth/register-form.tsx`)
- [x] Create OAuth callback route (`src/app/api/auth/callback/route.ts`)

### API Routes
- [x] Create items list/create route (`src/app/api/items/route.ts`)
- [x] Create item get/update/delete route (`src/app/api/items/[id]/route.ts`)

### UI Components
- [x] Create Button component (`src/components/ui/button.tsx`)
- [x] Create Input component (`src/components/ui/input.tsx`)
- [x] Create Textarea component (`src/components/ui/textarea.tsx`)
- [x] Create cn utility (`src/lib/utils/cn.ts`)

### Layout Components
- [x] Create Sidebar (`src/components/layout/sidebar.tsx`)
- [x] Create ItemList (`src/components/layout/item-list.tsx`)
- [x] Create ItemDetail (`src/components/layout/item-detail.tsx`)
- [x] Create ThreeColumnLayout (`src/components/layout/three-column-layout.tsx`)

### Dashboard
- [x] Create dashboard layout (`src/app/(dashboard)/layout.tsx`)
- [x] Create dashboard page (`src/app/(dashboard)/dashboard/page.tsx`)
- [x] Create useItems hook (`src/hooks/use-items.ts`)

### Documentation
- [x] Create ARCHITECTURE.md
- [x] Create TODO.md

---

## Phase 1.5: Demo Mode (NOT STARTED)

- [ ] Create demo mode that works without Supabase
- [ ] Use local state/localStorage for data persistence
- [ ] Add demo mode toggle or auto-detection

---

## Phase 2: Enhanced Features (NOT STARTED)

### Labels/Tags
- [ ] Create labels management UI
- [ ] Add label assignment to items
- [ ] Filter items by label

### Folders
- [ ] Create folder management UI
- [ ] Implement nested folder navigation
- [ ] Move items between folders

### Additional Item Types
- [ ] Bookmark type with URL field
- [ ] Password type with secure storage
- [ ] Serial number type
- [ ] Software license type

### Search
- [ ] Implement full-text search UI
- [ ] Search across all item types
- [ ] Search filters (type, date range, labels)

---

## Phase 3: Advanced Features (NOT STARTED)

### Client-Side Encryption
- [ ] Implement encryption key derivation
- [ ] Encrypt/decrypt note content
- [ ] Master password setup flow

### Import/Export
- [ ] Export data to JSON
- [ ] Import from JSON
- [ ] Import from Yojimbo (if applicable)

### UI Enhancements
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Drag and drop organization
- [ ] Rich text editor for notes

### Performance
- [ ] Implement pagination/infinite scroll
- [ ] Optimize bundle size
- [ ] Add loading skeletons

---

## Bugs & Issues

_None reported yet_

---

## Notes

- Supabase project needs to be created and configured before the app will work
- Run the SQL migration in Supabase SQL Editor before first use
- See ARCHITECTURE.md for technical details
