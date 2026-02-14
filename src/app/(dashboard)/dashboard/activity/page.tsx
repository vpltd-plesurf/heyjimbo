"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Globe,
  Lock,
  Hash,
  KeyRound,
  Folder,
  Plus,
  Pencil,
  Trash2,
  Flag,
  Pin,
  RotateCcw,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityEntry {
  id: string;
  action: string;
  item_id: string | null;
  item_name: string | null;
  item_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const typeIcons: Record<string, typeof FileText> = {
  note: FileText,
  bookmark: Globe,
  password: Lock,
  serial_number: Hash,
  software_license: KeyRound,
  folder: Folder,
};

const actionConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  create: { icon: Plus, label: "Created", color: "text-green-500" },
  update: { icon: Pencil, label: "Updated", color: "text-blue-500" },
  delete: { icon: Trash2, label: "Deleted", color: "text-rose-500" },
  trash: { icon: Trash2, label: "Trashed", color: "text-orange-500" },
  restore: { icon: RotateCcw, label: "Restored", color: "text-teal-500" },
  flag: { icon: Flag, label: "Flagged", color: "text-orange-500" },
  unflag: { icon: Flag, label: "Unflagged", color: "text-neutral-400" },
  pin: { icon: Pin, label: "Pinned", color: "text-primary" },
  unpin: { icon: Pin, label: "Unpinned", color: "text-neutral-400" },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function groupByDate(activities: ActivityEntry[]): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {};
  for (const a of activities) {
    const date = new Date(a.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  const fetchActivities = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/activity?${params}`);
    const data = await res.json();
    return data;
  }, []);

  useEffect(() => {
    fetchActivities()
      .then((data) => {
        if (!data.error) {
          setActivities(data.activities);
          setNextCursor(data.nextCursor);
        }
      })
      .finally(() => setLoading(false));
  }, [fetchActivities]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchActivities(nextCursor);
    if (!data.error) {
      setActivities((prev) => [...prev, ...data.activities]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  };

  const grouped = groupByDate(activities);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Activity
          </h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-neutral-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-neutral-200 rounded-lg w-3/4 mb-1" />
                  <div className="h-3 bg-neutral-200 rounded-lg w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-400">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([dateLabel, entries]) => (
              <div key={dateLabel}>
                <h2 className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest mb-3 px-1">
                  {dateLabel}
                </h2>
                <div className="space-y-1">
                  {entries.map((entry) => {
                    const config = actionConfig[entry.action] || actionConfig.update;
                    const ActionIcon = config.icon;
                    const TypeIcon = typeIcons[entry.item_type || ""] || FileText;

                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          if (entry.item_id && entry.action !== "delete") {
                            router.push(`/dashboard?item=${entry.item_id}`);
                          }
                        }}
                        disabled={!entry.item_id || entry.action === "delete"}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-hover transition-colors duration-150 text-left disabled:opacity-60 disabled:cursor-default"
                      >
                        <div className="relative flex-shrink-0">
                          <TypeIcon className="w-5 h-5 text-neutral-400" />
                          <ActionIcon className={`w-3 h-3 ${config.color} absolute -bottom-0.5 -right-0.5`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            <span className={`font-medium ${config.color}`}>{config.label}</span>
                            {" "}
                            <span className="text-neutral-600">
                              {entry.item_name || "Untitled"}
                            </span>
                          </p>
                        </div>
                        <span className="text-xs text-neutral-400 flex-shrink-0">
                          {formatRelativeTime(entry.created_at)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {nextCursor && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
