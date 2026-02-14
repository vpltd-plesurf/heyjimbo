import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Counts by type
    const { data: items } = await supabase
      .from("items")
      .select("type, is_trashed, is_flagged, created_at")
      .eq("user_id", user.id);

    const byType: Record<string, number> = {};
    let total = 0;
    let trashed = 0;
    let flagged = 0;
    const recentItems: string[] = [];

    for (const item of items || []) {
      if (!item.is_trashed) {
        byType[item.type] = (byType[item.type] || 0) + 1;
        total++;
      }
      if (item.is_trashed) trashed++;
      if (item.is_flagged) flagged++;
      recentItems.push(item.created_at);
    }

    // Labels count
    const { count: labelsCount } = await supabase
      .from("labels")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Attachments count and size
    const { data: attachments } = await supabase
      .from("attachments")
      .select("file_size")
      .eq("user_id", user.id);

    const totalAttachments = attachments?.length || 0;
    const totalStorageBytes = attachments?.reduce((sum, a) => sum + (a.file_size || 0), 0) || 0;

    // Items created in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentCount = recentItems.filter((d) => d > sevenDaysAgo).length;

    return NextResponse.json({
      total,
      trashed,
      flagged,
      byType,
      labels: labelsCount || 0,
      attachments: totalAttachments,
      storageBytes: totalStorageBytes,
      recentCount,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
