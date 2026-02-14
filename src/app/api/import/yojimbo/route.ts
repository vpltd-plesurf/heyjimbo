import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseYojimboZip } from "@/lib/import/yojimbo-parser";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await parseYojimboZip(buffer);

    // Create labels first and build a name -> id map
    const labelMap = new Map<string, string>();

    for (const label of result.labels) {
      // Check if label already exists for this user
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

    // Import items
    let importedCount = 0;

    for (const yItem of result.items) {
      // Dedup by name + created_at
      const { data: existingItem } = await supabase
        .from("items")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", yItem.name)
        .eq("created_at", yItem.created_at)
        .single();

      if (existingItem) continue;

      // Create item
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

      // Create type-specific content
      if (yItem.type === "note") {
        // Wrap plaintext content in HTML paragraphs
        const htmlContent = yItem.content
          ? yItem.content
              .split("\n")
              .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
              .join("")
          : "";

        await supabase
          .from("note_content")
          .insert({
            item_id: item.id,
            content: htmlContent,
            content_format: "html",
          });
      } else if (yItem.type === "bookmark") {
        await supabase
          .from("bookmark_content")
          .insert({
            item_id: item.id,
            url: yItem.url || "",
            source_url: yItem.source_url || "",
          });
      } else if (yItem.type === "password") {
        await supabase
          .from("password_content")
          .insert({
            item_id: item.id,
            location: yItem.location || "",
            account: yItem.account || "",
            password: yItem.password || yItem.content || "",
          });
      } else if (yItem.type === "serial_number") {
        await supabase
          .from("serial_number_content")
          .insert({
            item_id: item.id,
            serial_number: yItem.serial_number || "",
            owner_name: yItem.owner_name || "",
            owner_email: yItem.owner_email || "",
            organization: yItem.organization || "",
          });
      }

      // Assign label if present
      if (yItem.label_name && labelMap.has(yItem.label_name)) {
        await supabase
          .from("item_labels")
          .insert({
            item_id: item.id,
            label_id: labelMap.get(yItem.label_name)!,
          });
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        ...result.summary,
        actuallyImported: importedCount,
        labelsImported: result.labels.length,
      },
    });
  } catch (error) {
    console.error("Error importing Yojimbo data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LABEL_COLORS = [
  "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function getColorForIndex(index: number): string {
  return LABEL_COLORS[index % LABEL_COLORS.length];
}
