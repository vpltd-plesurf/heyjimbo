import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Create default labels for new users (idempotent — skips if they already exist)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingLabels } = await supabase
          .from("labels")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (!existingLabels || existingLabels.length === 0) {
          await supabase.from("labels").insert([
            { user_id: user.id, name: "Personal", color: "#3b82f6" },
            { user_id: user.id, name: "Work", color: "#10b981" },
            { user_id: user.id, name: "Important", color: "#ef4444" },
          ]);
        }
      }
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
