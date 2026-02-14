import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";

const ITEM_SELECT = `
  *,
  note_content (content, content_format),
  bookmark_content (url, source_url),
  password_content (location, account, password),
  serial_number_content (serial_number, owner_name, owner_email, organization),
  software_license_content (license_key, license_to, email, purchase_date, notes)
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
    const { name, is_flagged, is_trashed, is_pinned, content, content_format, parent_folder_id } = body;

    // Update item fields
    const itemUpdates: Record<string, unknown> = {};
    if (name !== undefined) itemUpdates.name = name;
    if (is_flagged !== undefined) itemUpdates.is_flagged = is_flagged;
    if (is_pinned !== undefined) itemUpdates.is_pinned = is_pinned;
    if (parent_folder_id !== undefined) itemUpdates.parent_folder_id = parent_folder_id;
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

    // Update software license content
    if (body.sl_license_key !== undefined || body.sl_license_to !== undefined || body.sl_email !== undefined || body.sl_purchase_date !== undefined || body.sl_notes !== undefined) {
      const updates: Record<string, unknown> = {};
      if (body.sl_license_key !== undefined) updates.license_key = body.sl_license_key;
      if (body.sl_license_to !== undefined) updates.license_to = body.sl_license_to;
      if (body.sl_email !== undefined) updates.email = body.sl_email;
      if (body.sl_purchase_date !== undefined) updates.purchase_date = body.sl_purchase_date;
      if (body.sl_notes !== undefined) updates.notes = body.sl_notes;

      const { error } = await supabase
        .from("software_license_content")
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

    // Log activity
    let action = "update";
    if (is_trashed === true) action = "trash";
    else if (is_trashed === false && body.is_trashed !== undefined) action = "restore";
    else if (is_flagged === true) action = "flag";
    else if (is_flagged === false && body.is_flagged !== undefined) action = "unflag";
    else if (is_pinned === true) action = "pin";
    else if (is_pinned === false && body.is_pinned !== undefined) action = "unpin";
    logActivity(supabase, user.id, action, data.id, data.name, data.type);

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

    // Fetch item name before deleting
    const { data: item } = await supabase
      .from("items")
      .select("name, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logActivity(supabase, user.id, "delete", null, item?.name, item?.type);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
