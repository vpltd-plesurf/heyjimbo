import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/attachments?item_id=xxx - List attachments for an item
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item_id");
    if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/attachments - Upload attachment
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const itemId = formData.get("item_id") as string | null;

    if (!file || !itemId) {
      return NextResponse.json({ error: "file and item_id required" }, { status: 400 });
    }

    // Verify item belongs to user
    const { data: item } = await supabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", user.id)
      .single();

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${itemId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create attachment record
    const { data: attachment, error: dbError } = await supabase
      .from("attachments")
      .insert({
        item_id: itemId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type || "application/octet-stream",
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file
      await supabase.storage.from("attachments").remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/attachments - Delete attachment
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("id");
    if (!attachmentId) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Get attachment to find storage path
    const { data: attachment } = await supabase
      .from("attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("user_id", user.id)
      .single();

    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from storage
    await supabase.storage.from("attachments").remove([attachment.storage_path]);

    // Delete record
    await supabase.from("attachments").delete().eq("id", attachmentId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
