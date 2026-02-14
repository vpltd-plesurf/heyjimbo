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

    if (body.items) {
      for (const yItem of body.items) {
        // Dedup by name + created_at
        const { data: existingItem } = await supabase
          .from("items")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", yItem.name)
          .eq("created_at", yItem.created_at)
          .single();

        if (existingItem) continue;

        const { data: item, error: itemError } = await supabase
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

        if (itemError || !item) continue;

        if (yItem.type === "note") {
          const htmlContent = yItem.content
            ? yItem.content
                .split("\n")
                .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
                .join("")
            : "";

          await supabase.from("note_content").insert({
            item_id: item.id,
            content: htmlContent,
            content_format: "html",
          });
        } else if (yItem.type === "bookmark") {
          await supabase.from("bookmark_content").insert({
            item_id: item.id,
            url: yItem.url || "",
            source_url: yItem.source_url || "",
          });
        } else if (yItem.type === "password") {
          await supabase.from("password_content").insert({
            item_id: item.id,
            location: yItem.location || "",
            account: yItem.account || "",
            password: yItem.password || yItem.content || "",
          });
        } else if (yItem.type === "serial_number") {
          await supabase.from("serial_number_content").insert({
            item_id: item.id,
            serial_number: yItem.serial_number || "",
            owner_name: yItem.owner_name || "",
            owner_email: yItem.owner_email || "",
            organization: yItem.organization || "",
          });
        }

        // Assign label if present
        if (yItem.label_name) {
          // Look up label ID - we need to fetch it since labels may have been created in a prior request
          const { data: labelData } = await supabase
            .from("labels")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", yItem.label_name)
            .single();

          if (labelData) {
            await supabase.from("item_labels").insert({
              item_id: item.id,
              label_id: labelData.id,
            });
          }
        }

        importedCount++;
      }
    }

    return NextResponse.json({ imported: importedCount });
  } catch (error) {
    console.error("Error importing batch:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
