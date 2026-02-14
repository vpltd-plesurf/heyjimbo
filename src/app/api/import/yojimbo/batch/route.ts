import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface BatchItem {
  name: string;
  type: string;
  content: string;
  is_flagged: boolean;
  is_trashed: boolean;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  label_name: string | null;
  url?: string;
  source_url?: string;
  location?: string;
  account?: string;
  password?: string;
  serial_number?: string;
  owner_name?: string;
  owner_email?: string;
  organization?: string;
  // Binary file data for images/PDFs
  file_data?: string; // base64
  file_name?: string;
  content_type?: string;
}

interface BatchLabel {
  name: string;
  display_index: number;
}

interface BatchRequest {
  items?: BatchItem[];
  labels?: BatchLabel[];
}

const LABEL_COLORS = [
  "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function getColorForIndex(index: number): string {
  return LABEL_COLORS[index % LABEL_COLORS.length];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BatchRequest = await request.json();

    // Import labels if provided
    const labelMap = new Map<string, string>();
    if (body.labels) {
      for (const label of body.labels) {
        const { data: existing } = await supabase
          .from("labels")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", label.name)
          .single();

        if (existing) {
          labelMap.set(label.name, existing.id);
        } else {
          const { data: newLabel, error } = await supabase
            .from("labels")
            .insert({
              user_id: user.id,
              name: label.name,
              color: getColorForIndex(label.display_index),
            })
            .select("id")
            .single();

          if (!error && newLabel) {
            labelMap.set(label.name, newLabel.id);
          }
        }
      }

      return NextResponse.json({ labelMap: Object.fromEntries(labelMap) });
    }

    // Import items batch
    let importedCount = 0;
    let lastItemId: string | null = null;

    if (body.items) {
      for (const yItem of body.items) {
        // Check if item already exists (by name + created_at)
        const { data: existingItem } = await supabase
          .from("items")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", yItem.name)
          .eq("created_at", yItem.created_at)
          .single();

        let itemId: string;

        if (existingItem) {
          // Update existing item's content (re-import with content fix)
          itemId = existingItem.id;
        } else {
          const { data: newItem, error: itemError } = await supabase
            .from("items")
            .insert({
              user_id: user.id,
              name: yItem.name,
              type: yItem.type,
              is_flagged: yItem.is_flagged,
              is_trashed: yItem.is_trashed,
              is_encrypted: yItem.is_encrypted,
              created_at: yItem.created_at,
              updated_at: yItem.updated_at,
            })
            .select("id")
            .single();

          if (itemError || !newItem) continue;
          itemId = newItem.id;
        }

        if (yItem.type === "note") {
          const htmlContent = yItem.content
            ? yItem.content
                .split("\n")
                .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
                .join("")
            : "";

          await supabase.from("note_content").upsert({
            item_id: itemId,
            content: htmlContent,
            content_format: "html",
          }, { onConflict: "item_id" });
        } else if (yItem.type === "bookmark") {
          await supabase.from("bookmark_content").upsert({
            item_id: itemId,
            url: yItem.url || "",
            source_url: yItem.source_url || "",
          }, { onConflict: "item_id" });
        } else if (yItem.type === "password") {
          await supabase.from("password_content").upsert({
            item_id: itemId,
            location: yItem.location || "",
            account: yItem.account || "",
            password: yItem.password || yItem.content || "",
          }, { onConflict: "item_id" });
        } else if (yItem.type === "serial_number") {
          await supabase.from("serial_number_content").upsert({
            item_id: itemId,
            serial_number: yItem.serial_number || "",
            owner_name: yItem.owner_name || "",
            owner_email: yItem.owner_email || "",
            organization: yItem.organization || "",
          }, { onConflict: "item_id" });
        }

        // Assign label if present (skip if already assigned)
        if (yItem.label_name) {
          const { data: labelData } = await supabase
            .from("labels")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", yItem.label_name)
            .single();

          if (labelData) {
            await supabase.from("item_labels").upsert({
              item_id: itemId,
              label_id: labelData.id,
            }, { onConflict: "item_id,label_id" });
          }
        }

        importedCount++;
        lastItemId = itemId;
      }
    }

    // Return itemId for single-item batches (used for file upload)
    return NextResponse.json({ imported: importedCount, itemId: lastItemId });
  } catch (error) {
    console.error("Error importing batch:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
