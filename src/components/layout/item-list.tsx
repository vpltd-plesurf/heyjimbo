"use client";

import { useState, useEffect, useRef } from "react";
import { format, isValid } from "date-fns";
import { FileText, Flag, Globe, Lock, Hash, KeyRound, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import type { Item } from "@/types/item";

export type { Item };

const typeIcons: Record<string, typeof FileText> = {
  note: FileText,
  bookmark: Globe,
  password: Lock,
  serial_number: Hash,
  software_license: KeyRound,
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
  if (item.type === "software_license") {
    return item.software_license_content?.license_key || "No license key";
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
  onMoveToFolder?: (itemId: string, folderId: string) => void;
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
  onMoveToFolder,
}: ItemListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
    <div className="flex flex-col h-full bg-surface-secondary border-r border-border">
      {/* Search */}
      <div className="p-3 border-b border-border">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors duration-150"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery && !loading && (
          <p className="text-xs text-neutral-400 mt-1">
            {items.length} result{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-2 space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-surface p-4 animate-pulse">
                <div className="h-4 bg-neutral-200 rounded-lg w-2/3 mb-2" />
                <div className="h-3 bg-neutral-200 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-neutral-400">No items found</div>
        ) : (
          <>
            <div className="p-2 space-y-1">
              {items.map((item) => {
                const Icon = typeIcons[item.type] || FileText;
                const isFolder = item.type === "folder";
                const isDragOver = dragOverId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    draggable={!isFolder}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", item.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (isFolder) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverId(item.id);
                      }
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverId(null);
                      if (isFolder && onMoveToFolder) {
                        const draggedId = e.dataTransfer.getData("text/plain");
                        if (draggedId && draggedId !== item.id) {
                          onMoveToFolder(draggedId, item.id);
                        }
                      }
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl shadow-card transition-all duration-200 hover:shadow-card-hover hover:translate-y-[-1px]",
                      selectedId === item.id
                        ? "bg-primary-lighter ring-1 ring-primary/30"
                        : "bg-surface hover:bg-surface-hover",
                      isDragOver && "bg-primary-lighter ring-2 ring-primary/40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 text-neutral-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[15px] text-foreground truncate">
                            {item.name}
                          </span>
                          {item.is_flagged && (
                            <Flag className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-neutral-500 truncate mt-0.5">
                          {getPreview(item)}
                        </p>
                        {item.labels && item.labels.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {item.labels.slice(0, 2).map((label) => (
                              <span
                                key={label.id}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-surface-secondary text-neutral-500"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                {label.name}
                              </span>
                            ))}
                            {item.labels.length > 2 && (
                              <span className="text-[10px] text-neutral-400">
                                +{item.labels.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-neutral-400 mt-1">
                          {item.is_trashed && item.trashed_at
                            ? (() => {
                                const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(item.trashed_at).getTime()) / (1000 * 60 * 60 * 24)));
                                return <span className="text-rose">{daysLeft}d until auto-delete</span>;
                              })()
                            : isValid(new Date(item.updated_at))
                              ? format(new Date(item.updated_at), "MMM d, yyyy")
                              : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="p-3 text-center text-xs text-neutral-400">
                {loadingMore ? "Loading more..." : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
