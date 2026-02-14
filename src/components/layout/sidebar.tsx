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
  ChevronDown,
  Import,
  Download,
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
  { id: "flagged", label: "Flagged", icon: Flag },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const newItemTypes = [
  { type: "note", label: "Note", icon: FileText },
  { type: "bookmark", label: "Bookmark", icon: Globe },
  { type: "password", label: "Password", icon: Lock },
  { type: "serial_number", label: "Serial Number", icon: Hash },
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
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
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
          <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
            {newItemTypes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  onClick={() => {
                    onNewItem(t.type);
                    setShowNewMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = currentFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </button>
          );
        })}

        {/* Labels section */}
        {labels.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Labels
              </span>
              <button
                onClick={() => setShowLabelManager(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
            {labels.map((label) => {
              const isActive = currentFilter === `label:${label.id}`;
              return (
                <button
                  key={label.id}
                  onClick={() => onFilterChange(`label:${label.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                      : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="w-full justify-start text-gray-600 dark:text-gray-400"
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
              className="w-full justify-start text-gray-600 dark:text-gray-400"
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
              className="w-full justify-start text-gray-600 dark:text-gray-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-gray-600 dark:text-gray-400"
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
