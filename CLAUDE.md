# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Rules

1. **Think first, read second, act third** - Think through the problem, read all relevant files, confirm the approach, then make changes.
2. **Check in before major changes** - Before multi-file changes or architectural decisions, verify the plan with the user.
3. **Explain at a high level** - Provide a concise summary of what changed and why after each step.
4. **Keep it simple** - Prefer the smallest change that solves the problem. Avoid cascading refactors.
5. **Never speculate about unread code** - Always read a file before making claims about it. No hallucinated code. Investigate and read relevant files BEFORE answering questions about the codebase.
6. **Maintain architecture documentation** - Update ARCHITECTURE.md when adding new routes, components, or changing data flow patterns.

## Project Conventions

- **Types**: Shared types live in `src/types/`. Do not co-locate type definitions with UI components.
- **State management**: React hooks only (no external state libraries). Custom hooks in `src/hooks/`.
- **API routes**: Always validate auth first. Return consistent error shapes: `{ error: string }` with appropriate status codes.
- **Error handling**: Surface errors to the user via UI state. Never rely on `console.error` alone for user-facing failures.
- **Database changes**: All schema changes via migration files in `supabase/migrations/`.
- **Naming**: React components use PascalCase. Hooks use `use-` prefix with kebab-case filenames. API routes follow Next.js App Router conventions.

## Architecture Overview

- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth)
- **Layout**: Three-column — Sidebar (nav) | ItemList (browse/search) | ItemDetail (edit with auto-save)
- **Data flow**: Component -> `useItems` hook -> API routes -> Supabase with RLS
- **Auth**: Middleware-based session refresh + route protection. RLS on all tables.
- See `ARCHITECTURE.md` for full documentation.

## Tool Usage

- Use the `vercel-react-best-practices` skill for any React/Next.js code generation, review, or optimization.
- Use the `web-design-guidelines` skill when modifying UI components or reviewing accessibility.

## Key Files

- `src/types/item.ts` - Shared Item type definition
- `src/hooks/use-items.ts` - Central data hook (CRUD, fetch with abort controller, debounced search)
- `src/components/layout/three-column-layout.tsx` - Main layout orchestrator
- `src/app/api/items/route.ts` - List/create API
- `src/app/api/items/[id]/route.ts` - Get/update/delete API
- `src/middleware.ts` - Auth gate and session refresh
- `supabase/migrations/` - Database schema and RLS policies
