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

// GET /api/items - List items
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isFlagged = searchParams.get("flagged");
    const isTrashed = searchParams.get("trashed");
    const search = searchParams.get("search");
    const cursor = searchParams.get("cursor");
    const folderId = searchParams.get("folder");
    const sort = searchParams.get("sort") || "updated_at";
    const sortDir = searchParams.get("sort_dir") || "desc";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const validSorts: Record<string, string> = {
      updated_at: "updated_at",
      created_at: "created_at",
      name: "name",
      type: "type",
    };
    const sortColumn = validSorts[sort] || "updated_at";
    const ascending = sortDir === "asc";

    let query = supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order(sortColumn, { ascending })
      .limit(limit + 1);

    if (type) {
      query = query.eq("type", type);
    }
    if (isFlagged === "true") {
      query = query.eq("is_flagged", true);
    }
    if (isTrashed === "true") {
      query = query.eq("is_trashed", true);
    } else {
      query = query.eq("is_trashed", false);
    }
    if (search) {
      const trimmed = search.trim();
      if (trimmed.length >= 3) {
        // Full-text search across name + content via search_vector
        const tsQuery = trimmed.split(/\s+/).map(w => `${w}:*`).join(" & ");
        query = query.textSearch("search_vector", tsQuery);
      } else {
        // Short queries: use ilike for partial matching
        query = query.ilike("name", `%${trimmed}%`);
      }
    }
    if (cursor) {
      if (ascending) {
        query = query.gt(sortColumn, cursor);
      } else {
        query = query.lt(sortColumn, cursor);
      }
    }
    // Folder filtering — only when not searching/filtering by type/flag/trash
    if (folderId) {
      query = query.eq("parent_folder_id", folderId);
    } else if (!search && !type && !isFlagged && !isTrashed) {
      query = query.is("parent_folder_id", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? items[items.length - 1][sortColumn] : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/items - Create item
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type = "note", content = "", content_format = "html", parent_folder_id } = body;

    // Create the item
    const { data: item, error: itemError } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        name: name || (type === "folder" ? "New Folder" : "Untitled"),
        type,
        ...(parent_folder_id ? { parent_folder_id } : {}),
      })
      .select()
      .single();

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // Create type-specific content
    let contentError = null;

    if (type === "note") {
      const { error } = await supabase
        .from("note_content")
        .insert({ item_id: item.id, content, content_format });
      contentError = error;
    } else if (type === "bookmark") {
      const { error } = await supabase
        .from("bookmark_content")
        .insert({ item_id: item.id, url: body.url || "", source_url: body.source_url || "" });
      contentError = error;
    } else if (type === "password") {
      const { error } = await supabase
        .from("password_content")
        .insert({ item_id: item.id, location: "", account: "", password: "" });
      contentError = error;
    } else if (type === "serial_number") {
      const { error } = await supabase
        .from("serial_number_content")
        .insert({ item_id: item.id, serial_number: "" });
      contentError = error;
    } else if (type === "software_license") {
      const { error } = await supabase
        .from("software_license_content")
        .insert({ item_id: item.id, license_key: "" });
      contentError = error;
    }

    if (contentError) {
      await supabase.from("items").delete().eq("id", item.id);
      return NextResponse.json(
        { error: contentError.message },
        { status: 500 }
      );
    }

    // Fetch the complete item with all content
    const { data: completeItem, error: fetchError } = await supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("id", item.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    logActivity(supabase, user.id, "create", completeItem.id, completeItem.name, completeItem.type);

    return NextResponse.json(completeItem, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
