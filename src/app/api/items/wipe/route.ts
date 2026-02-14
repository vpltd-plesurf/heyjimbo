import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/items/wipe - Delete all user data for clean import
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clean up storage files first (before DB cascade removes references)
    const { data: files } = await supabase.storage
      .from("attachments")
      .list(user.id, { limit: 1000 });

    if (files && files.length > 0) {
      // List subdirectories (item IDs) and remove all files
      for (const folder of files) {
        const { data: subFiles } = await supabase.storage
          .from("attachments")
          .list(`${user.id}/${folder.name}`, { limit: 1000 });

        if (subFiles && subFiles.length > 0) {
          const paths = subFiles.map(f => `${user.id}/${folder.name}/${f.name}`);
          await supabase.storage.from("attachments").remove(paths);
        }
      }
    }

    // Delete all items (cascades to content tables, item_labels, attachments records)
    await supabase.from("items").delete().eq("user_id", user.id);

    // Delete all labels
    await supabase.from("labels").delete().eq("user_id", user.id);

    // Delete activity log
    await supabase.from("activity_log").delete().eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error wiping data:", error);
    return NextResponse.json(
      { error: "Failed to wipe data" },
      { status: 500 }
    );
  }
}
