import type { Item } from "@/types/item";

export const DEMO_SEED_ITEMS: Item[] = [
  {
    id: "demo-001",
    name: "Welcome to HeyJimbo",
    type: "note",
    is_flagged: true,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-14T10:00:00Z",
    updated_at: "2026-02-14T10:00:00Z",
    note_content: {
      content:
        "<p>HeyJimbo is your personal information organizer. This is a demo — your data is stored locally in the browser and will persist across page reloads.</p><p>Try creating a new note, flagging an item, or searching!</p>",
      content_format: "html",
    },
  },
  {
    id: "demo-002",
    name: "Meeting Notes",
    type: "note",
    is_flagged: false,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-13T14:30:00Z",
    updated_at: "2026-02-13T16:45:00Z",
    note_content: {
      content:
        "<p>Discussed roadmap priorities for Q1:</p><ul><li><p>Ship labels and tags UI</p></li><li><p>Add bookmark and password item types</p></li><li><p>Implement Yojimbo backup import</p></li><li><p>Explore client-side encryption for sensitive items</p></li></ul>",
      content_format: "html",
    },
  },
  {
    id: "demo-003",
    name: "Grocery List",
    type: "note",
    is_flagged: true,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-12T09:00:00Z",
    updated_at: "2026-02-14T08:15:00Z",
    note_content: {
      content:
        "<ul><li><p>Eggs</p></li><li><p>Sourdough bread</p></li><li><p>Olive oil</p></li><li><p>Lemons</p></li><li><p>Fresh basil</p></li><li><p>Parmesan</p></li></ul>",
      content_format: "html",
    },
  },
  {
    id: "demo-004",
    name: "App Ideas",
    type: "note",
    is_flagged: false,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-10T20:00:00Z",
    updated_at: "2026-02-11T11:30:00Z",
    note_content: {
      content:
        "<p>Random app ideas to explore later:</p><ol><li><p>Habit tracker with streaks</p></li><li><p>Recipe scaler (adjust serving sizes)</p></li><li><p>Local-first markdown wiki</p></li><li><p>Browser extension for saving bookmarks with tags</p></li></ol>",
      content_format: "html",
    },
  },
  {
    id: "demo-005",
    name: "GitHub",
    type: "bookmark",
    is_flagged: false,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-13T09:00:00Z",
    updated_at: "2026-02-13T09:00:00Z",
    bookmark_content: {
      url: "https://github.com",
      source_url: "",
    },
  },
  {
    id: "demo-006",
    name: "Tailwind CSS Docs",
    type: "bookmark",
    is_flagged: true,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-12T15:00:00Z",
    updated_at: "2026-02-12T15:00:00Z",
    bookmark_content: {
      url: "https://tailwindcss.com/docs",
      source_url: "",
    },
  },
  {
    id: "demo-007",
    name: "Email Account",
    type: "password",
    is_flagged: false,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-11T12:00:00Z",
    updated_at: "2026-02-11T12:00:00Z",
    password_content: {
      location: "mail.example.com",
      account: "user@example.com",
      password: "demo-password-123",
    },
  },
  {
    id: "demo-008",
    name: "Photoshop License",
    type: "serial_number",
    is_flagged: false,
    is_trashed: false,
    is_pinned: false,
    created_at: "2026-02-10T10:00:00Z",
    updated_at: "2026-02-10T10:00:00Z",
    serial_number_content: {
      serial_number: "PSCC-1234-5678-ABCD",
      owner_name: "Demo User",
      owner_email: "demo@example.com",
      organization: "Demo Corp",
    },
  },
];
