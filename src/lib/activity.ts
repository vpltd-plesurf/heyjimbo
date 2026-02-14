import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  itemId?: string | null,
  itemName?: string | null,
  itemType?: string | null,
  details?: Record<string, unknown>
) {
  await supabase.from("activity_log").insert({
    user_id: userId,
    item_id: itemId || null,
    action,
    item_name: itemName || null,
    item_type: itemType || null,
    details: details || {},
  });
}
