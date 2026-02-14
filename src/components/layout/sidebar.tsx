"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Flag,
  Trash2,
  Plus,
  LogOut,
  Folder,
  Settings,
  Globe,
  Lock,
  Hash,
  KeyRound,
  ChevronDown,
  Import,
  Download,
  BarChart3,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useLabels } from "@/hooks/use-labels";
import { LabelManager } from "@/components/labels/label-manager";
import { GuideTip } from "@/components/guide/guide-tip";

interface SidebarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  onNewItem: (type?: string) => void;
}

const filters = [
  { id: "all", label: "All Items", icon: Folder },
  { id: "note", label: "Notes", icon: FileText },
  { id: "bookmark", label: "Bookmarks", icon: Globe },
  { id: "password", label: "Passwords", icon: Lock },
  { id: "serial_number", label: "Serial Numbers", icon: Hash },
  { id: "software_license", label: "Licenses", icon: KeyRound },
  { id: "flagged", label: "Flagged", icon: Flag },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const newItemTypes = [
  { type: "note", label: "Note", icon: FileText },
  { type: "bookmark", label: "Bookmark", icon: Globe },
  { type: "password", label: "Password", icon: Lock },
  { type: "serial_number", label: "Serial Number", icon: Hash },
  { type: "software_license", label: "Software License", icon: KeyRound },
  { type: "folder", label: "Folder", icon: Folder },
];

const isDemo = isDemoMode();

export function Sidebar({
  currentFilter,
  onFilterChange,
  onNewItem,
}: SidebarProps) {
  const router = useRouter();
  const supabase = isDemo ? null : createClient();
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const {
    labels,
    createLabel,
    updateLabel,
    deleteLabel,
  } = useLabels();

  const handleSignOut = async () => {
    if (isDemo) {
      localStorage.removeItem("heyjimbo-demo-items");
      localStorage.removeItem("heyjimbo-demo-labels");
      localStorage.removeItem("heyjimbo-demo-item-labels");
      router.push("/login");
      return;
    }
    await supabase!.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-surface-secondary border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">
          HeyJimbo
        </h1>
        {isDemo && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Demo Mode
          </p>
        )}
      </div>

      {/* New Item Button with Type Selector */}
      <div className="p-4 relative">
        <GuideTip
          tipId="new-item"
          title="Create Items"
          description="Click to add notes, bookmarks, passwords, and more. Use the dropdown for specific types."
        >
        <div className="flex gap-1">
          <Button
            onClick={() => onNewItem("note")}
            className="flex-1"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
          <Button
            onClick={() => setShowNewMenu(!showNewMenu)}
            size="sm"
            variant="outline"
            className="px-2"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        {showNewMenu && (
          <div className="absolute left-4 right-4 mt-1 bg-surface border border-border rounded-xl shadow-card-hover z-10 overflow-hidden">
            {newItemTypes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  onClick={() => {
                    onNewItem(t.type);
                    setShowNewMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-600 hover:bg-surface-hover transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
        </GuideTip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <GuideTip
          tipId="filters"
          title="Browse by Type"
          description="Filter your items by category — notes, bookmarks, passwords, and more."
          position="right"
        >
          <div />
        </GuideTip>
        {filters.map((filter, index) => {
          const Icon = filter.icon;
          const isActive = currentFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary-lighter text-primary font-medium"
                  : "text-neutral-600 hover:bg-surface-hover"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{filter.label}</span>
              <kbd className="text-[10px] text-neutral-400 font-mono opacity-60">
                {"\u2318"}{index + 1}
              </kbd>
            </button>
          );
        })}

        {/* Labels section */}
        {labels.length > 0 && (
          <>
            <GuideTip
              tipId="labels"
              title="Organize with Labels"
              description="Create color-coded labels to group and find items. Click the gear icon to manage them."
              position="right"
            >
            <div className="pt-3 pb-1 px-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest">
                Labels
              </span>
              <button
                onClick={() => setShowLabelManager(true)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors duration-150"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
            </GuideTip>
            {labels.map((label) => {
              const isActive = currentFilter === `label:${label.id}`;
              return (
                <button
                  key={label.id}
                  onClick={() => onFilterChange(`label:${label.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary-lighter text-primary font-medium"
                      : "text-neutral-600 hover:bg-surface-hover"
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="w-full justify-start text-neutral-500"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Moon className="w-4 h-4 mr-2" />
          )}
          {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
        {!isDemo && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/import")}
              className="w-full justify-start text-neutral-500"
            >
              <Import className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.open("/api/export?format=json", "_blank");
              }}
              className="w-full justify-start text-neutral-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/activity")}
              className="w-full justify-start text-neutral-500"
            >
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/stats")}
              className="w-full justify-start text-neutral-500"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/settings")}
          className="w-full justify-start text-neutral-500"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-neutral-500"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>

      {/* Label Manager Modal */}
      {showLabelManager && (
        <LabelManager
          labels={labels}
          onCreateLabel={createLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onClose={() => setShowLabelManager(false)}
        />
      )}
    </div>
  );
}
