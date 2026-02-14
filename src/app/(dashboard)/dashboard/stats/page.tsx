"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Globe, Lock, Hash, KeyRound, Folder,
  Flag, Trash2, Tag, Paperclip, ArrowLeft, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  total: number;
  trashed: number;
  flagged: number;
  byType: Record<string, number>;
  labels: number;
  attachments: number;
  storageBytes: number;
  recentCount: number;
}

const typeIcons: Record<string, typeof FileText> = {
  note: FileText,
  bookmark: Globe,
  password: Lock,
  serial_number: Hash,
  software_license: KeyRound,
  folder: Folder,
};

const typeLabels: Record<string, string> = {
  note: "Notes",
  bookmark: "Bookmarks",
  password: "Passwords",
  serial_number: "Serial Numbers",
  software_license: "Licenses",
  folder: "Folders",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse">
                  <div className="h-4 bg-neutral-200 rounded-lg w-2/3 mb-2" />
                  <div className="h-6 bg-neutral-200 rounded-lg w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={FileText} label="Total Items" value={stats.total} />
              <StatCard icon={Activity} label="Last 7 Days" value={stats.recentCount} />
              <StatCard icon={Flag} label="Flagged" value={stats.flagged} color="text-orange-500" />
              <StatCard icon={Trash2} label="In Trash" value={stats.trashed} color="text-rose" />
            </div>

            {/* Items by type */}
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-card">
              <h2 className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest mb-4">
                Items by Type
              </h2>
              <div className="space-y-3">
                {Object.entries(stats.byType).map(([type, count]) => {
                  const Icon = typeIcons[type] || FileText;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-sm text-neutral-600 w-28">
                        {typeLabels[type] || type}
                      </span>
                      <div className="flex-1 bg-neutral-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Storage & Labels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Tag} label="Labels" value={stats.labels} />
              <StatCard icon={Paperclip} label="Attachments" value={stats.attachments} />
              <div className="bg-surface rounded-2xl p-5 border border-border shadow-card hover:shadow-card-hover transition-shadow duration-200 flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Storage Used</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatBytes(stats.storageBytes)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-neutral-400">Failed to load stats</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border shadow-card hover:shadow-card-hover transition-shadow duration-200 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color || "text-neutral-400"}`} />
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
