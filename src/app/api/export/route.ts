import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ITEM_SELECT = `
  *,
  note_content (content, content_format),
  bookmark_content (url, source_url),
  password_content (location, account, password),
  serial_number_content (serial_number, owner_name, owner_email, organization)
`;

// GET /api/export?format=json|csv - Export all items
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Fetch all items
    const { data: items, error } = await supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch labels
    const { data: labels } = await supabase
      .from("labels")
      .select("*")
      .eq("user_id", user.id);

    // Fetch item-label assignments
    const { data: itemLabels } = await supabase
      .from("item_labels")
      .select("item_id, label_id")
      .in("item_id", items?.map((i) => i.id) || []);

    // Build label lookup
    const labelMap = new Map<string, string>();
    labels?.forEach((l) => labelMap.set(l.id, l.name));

    const itemLabelNames = new Map<string, string[]>();
    itemLabels?.forEach((il) => {
      const names = itemLabelNames.get(il.item_id) || [];
      const labelName = labelMap.get(il.label_id);
      if (labelName) names.push(labelName);
      itemLabelNames.set(il.item_id, names);
    });

    if (format === "csv") {
      const headers = [
        "name", "type", "is_flagged", "is_trashed", "labels",
        "created_at", "updated_at",
        "note_content", "bookmark_url", "bookmark_source_url",
        "pw_location", "pw_account", "pw_password",
        "serial_number", "owner_name", "owner_email", "organization",
      ];

      const rows = (items || []).map((item) => [
        escapeCsv(item.name),
        item.type,
        item.is_flagged ? "true" : "false",
        item.is_trashed ? "true" : "false",
        escapeCsv((itemLabelNames.get(item.id) || []).join("; ")),
        item.created_at,
        item.updated_at,
        escapeCsv(item.note_content?.content || ""),
        escapeCsv(item.bookmark_content?.url || ""),
        escapeCsv(item.bookmark_content?.source_url || ""),
        escapeCsv(item.password_content?.location || ""),
        escapeCsv(item.password_content?.account || ""),
        escapeCsv(item.password_content?.password || ""),
        escapeCsv(item.serial_number_content?.serial_number || ""),
        escapeCsv(item.serial_number_content?.owner_name || ""),
        escapeCsv(item.serial_number_content?.owner_email || ""),
        escapeCsv(item.serial_number_content?.organization || ""),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="heyjimbo-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // JSON export
    const exportData = {
      exported_at: new Date().toISOString(),
      version: "1.0",
      labels: labels || [],
      items: (items || []).map((item) => ({
        ...item,
        label_names: itemLabelNames.get(item.id) || [],
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="heyjimbo-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
