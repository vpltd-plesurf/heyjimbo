import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ITEM_SELECT = `
  *,
  note_content (content, content_format),
  bookmark_content (url, source_url),
  password_content (location, account, password),
  serial_number_content (serial_number, owner_name, owner_email, organization)
`;

// GET /api/items/[id] - Get single item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/items/[id] - Update item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, is_flagged, is_trashed, content, content_format } = body;

    // Update item fields
    const itemUpdates: Record<string, unknown> = {};
    if (name !== undefined) itemUpdates.name = name;
    if (is_flagged !== undefined) itemUpdates.is_flagged = is_flagged;
    if (is_trashed !== undefined) {
      itemUpdates.is_trashed = is_trashed;
      itemUpdates.trashed_at = is_trashed ? new Date().toISOString() : null;
    }

    let hasContentUpdate = false;

    if (Object.keys(itemUpdates).length > 0) {
      const { error: itemError } = await supabase
        .from("items")
        .update(itemUpdates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (itemError) {
        return NextResponse.json({ error: itemError.message }, { status: 500 });
      }
    }

    // Update note content
    if (content !== undefined || content_format !== undefined) {
      const contentUpdates: Record<string, unknown> = {};
      if (content !== undefined) contentUpdates.content = content;
      if (content_format !== undefined) contentUpdates.content_format = content_format;

      const { error } = await supabase
        .from("note_content")
        .update(contentUpdates)
        .eq("item_id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      hasContentUpdate = true;
    }

    // Update bookmark content
    if (body.bookmark_url !== undefined || body.bookmark_source_url !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.bookmark_url !== undefined) updates.url = body.bookmark_url;
      if (body.bookmark_source_url !== undefined) updates.source_url = body.bookmark_source_url;

      const { error } = await supabase
        .from("bookmark_content")
        .update(updates)
        .eq("item_id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      hasContentUpdate = true;
    }

    // Update password content
    if (body.pw_location !== undefined || body.pw_account !== undefined || body.pw_password !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.pw_location !== undefined) updates.location = body.pw_location;
      if (body.pw_account !== undefined) updates.account = body.pw_account;
      if (body.pw_password !== undefined) updates.password = body.pw_password;

      const { error } = await supabase
        .from("password_content")
        .update(updates)
        .eq("item_id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      hasContentUpdate = true;
    }

    // Update serial number content
    if (body.sn_serial_number !== undefined || body.sn_owner_name !== undefined || body.sn_owner_email !== undefined || body.sn_organization !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.sn_serial_number !== undefined) updates.serial_number = body.sn_serial_number;
      if (body.sn_owner_name !== undefined) updates.owner_name = body.sn_owner_name;
      if (body.sn_owner_email !== undefined) updates.owner_email = body.sn_owner_email;
      if (body.sn_organization !== undefined) updates.organization = body.sn_organization;

      const { error } = await supabase
        .from("serial_number_content")
        .update(updates)
        .eq("item_id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      hasContentUpdate = true;
    }

    // Touch items.updated_at so sort order reflects content edits
    if (hasContentUpdate && Object.keys(itemUpdates).length === 0) {
      await supabase
        .from("items")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    // Fetch and return updated item
    const { data, error } = await supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/items/[id] - Delete item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
