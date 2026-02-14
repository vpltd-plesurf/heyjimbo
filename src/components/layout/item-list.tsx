"use client";

import { useEffect, useRef } from "react";
import { format, isValid } from "date-fns";
import { FileText, Flag, Globe, Lock, Hash, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import type { Item } from "@/types/item";

export type { Item };

const typeIcons: Record<string, typeof FileText> = {
  note: FileText,
  bookmark: Globe,
  password: Lock,
  serial_number: Hash,
  folder: Folder,
};

function getPreview(item: Item): string {
  if (item.type === "note") {
    return item.note_content?.content?.replace(/<[^>]*>/g, "").slice(0, 50) || "No content";
  }
  if (item.type === "bookmark") {
    return item.bookmark_content?.url || "No URL";
  }
  if (item.type === "password") {
    return item.password_content?.location || "No location";
  }
  if (item.type === "serial_number") {
    return item.serial_number_content?.serial_number || "No serial number";
  }
  if (item.type === "folder") {
    return "Folder";
  }
  return "No content";
}

interface ItemListProps {
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function ItemList({
  items,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  loading,
  searchInputRef,
  hasMore,
  loadingMore,
  onLoadMore,
}: ItemListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search... (⌘K)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-sm pr-7"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery && !loading && (
          <p className="text-xs text-gray-400 mt-1">
            {items.length} result{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No items found</div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const Icon = typeIcons[item.type] || FileText;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                        selectedId === item.id &&
                          "bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-indigo-500"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {item.name}
                            </span>
                            {item.is_flagged && (
                              <Flag className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {getPreview(item)}
                          </p>
                          {item.labels && item.labels.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {item.labels.slice(0, 2).map((label) => (
                                <span
                                  key={label.id}
                                  className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  />
                                  {label.name}
                                </span>
                              ))}
                              {item.labels.length > 2 && (
                                <span className="text-[10px] text-gray-400">
                                  +{item.labels.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {isValid(new Date(item.updated_at))
                              ? format(new Date(item.updated_at), "MMM d, yyyy")
                              : "Unknown date"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="p-3 text-center text-xs text-gray-400">
                {loadingMore ? "Loading more..." : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
