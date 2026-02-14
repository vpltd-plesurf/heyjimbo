import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/encryption — Check if user has master password set
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("encryption_settings")
      .select("salt, verify_token")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      return NextResponse.json({ hasMasterPassword: false });
    }

    return NextResponse.json({
      hasMasterPassword: true,
      salt: data.salt,
      verifyToken: data.verify_token,
    });
  } catch (error) {
    console.error("Error fetching encryption settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/encryption — Set up master password (save salt + verify token)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salt, verifyToken } = await request.json();

    if (!salt || !verifyToken) {
      return NextResponse.json(
        { error: "Salt and verify token are required" },
        { status: 400 }
      );
    }

    // Upsert encryption settings
    const { error } = await supabase
      .from("encryption_settings")
      .upsert(
        {
          user_id: user.id,
          salt,
          verify_token: verifyToken,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving encryption settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
