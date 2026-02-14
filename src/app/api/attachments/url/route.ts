import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

    // Verify the path belongs to the user
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(path, 3600);

    if (!data?.signedUrl) {
      return NextResponse.json({ error: "Failed to create URL" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
