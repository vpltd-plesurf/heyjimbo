"use client";

import { useState, useEffect, useRef } from "react";
import { format, isValid } from "date-fns";
import { FileText, Flag, Globe, Lock, Hash, KeyRound, Folder, X, CheckSquare, Square, Trash2, FolderInput, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GuideTip } from "@/components/guide/guide-tip";
import type { Item, Label } from "@/types/item";

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
  onBulkTrash?: (ids: string[]) => void;
  onBulkFlag?: (ids: string[], flagged: boolean) => void;
  onBulkLabel?: (ids: string[], labelId: string) => void;
  onBulkMove?: (ids: string[], folderId: string) => void;
  allLabels?: Label[];
  folders?: Item[];
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
  onBulkTrash,
  onBulkFlag,
  onBulkLabel,
  onBulkMove,
  allLabels = [],
  folders = [],
}: ItemListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkLabelMenu, setShowBulkLabelMenu] = useState(false);
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);

  const selectionMode = selectedIds.size > 0;

  // Clear selection when items change (filter/search change)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [items.length, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkLabelMenu(false);
    setShowBulkMoveMenu(false);
  };

  const handleBulkTrash = () => {
    if (onBulkTrash && selectedIds.size > 0) {
      onBulkTrash(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleBulkFlag = () => {
    if (onBulkFlag && selectedIds.size > 0) {
      onBulkFlag(Array.from(selectedIds), true);
      clearSelection();
    }
  };

  const handleBulkLabel = (labelId: string) => {
    if (onBulkLabel && selectedIds.size > 0) {
      onBulkLabel(Array.from(selectedIds), labelId);
      clearSelection();
    }
  };

  const handleBulkMove = (folderId: string) => {
    if (onBulkMove && selectedIds.size > 0) {
      onBulkMove(Array.from(selectedIds), folderId);
      clearSelection();
    }
  };

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
        <GuideTip
          tipId="search"
          title="Quick Search"
          description="Type to search across all your items. Press ⌘K from anywhere to jump here instantly."
        >
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
        </GuideTip>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <div className="px-2 py-2 border-b border-border bg-primary-lighter animate-fade-in">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs font-medium text-primary flex-1">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:text-primary/80 transition-colors duration-150"
            >
              All
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-neutral-500 hover:text-neutral-600 transition-colors duration-150 ml-1"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkFlag}
              className="h-7 px-2 text-xs"
              title="Flag selected"
            >
              <Flag className="w-3.5 h-3.5 mr-1" />
              Flag
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkTrash}
              className="h-7 px-2 text-xs"
              title="Trash selected"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Trash
            </Button>
            {allLabels.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowBulkLabelMenu(!showBulkLabelMenu); setShowBulkMoveMenu(false); }}
                  className="h-7 px-2 text-xs"
                  title="Label selected"
                >
                  <Tag className="w-3.5 h-3.5 mr-1" />
                  Label
                </Button>
                {showBulkLabelMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBulkLabelMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-card-hover p-1 min-w-[140px]">
                      {allLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => handleBulkLabel(label.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg hover:bg-surface-hover transition-colors duration-150 text-left"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {folders.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowBulkMoveMenu(!showBulkMoveMenu); setShowBulkLabelMenu(false); }}
                  className="h-7 px-2 text-xs"
                  title="Move selected to folder"
                >
                  <FolderInput className="w-3.5 h-3.5 mr-1" />
                  Move
                </Button>
                {showBulkMoveMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBulkMoveMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-card-hover p-1 min-w-[140px]">
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleBulkMove(folder.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg hover:bg-surface-hover transition-colors duration-150 text-left"
                        >
                          <Folder className="w-3.5 h-3.5 text-neutral-400" />
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <GuideTip
        tipId="folders"
        title="Drag to Folders"
        description="Drag items onto folders in the list to organize them. Click a folder to navigate into it."
        position="bottom"
      >
        <div />
      </GuideTip>
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
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      if (e.shiftKey || e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        toggleSelect(item.id);
                      } else if (selectionMode) {
                        toggleSelect(item.id);
                      } else {
                        onSelect(item.id);
                      }
                    }}
                    draggable={!isFolder && !selectionMode}
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
                      selectedId === item.id && !selectionMode
                        ? "bg-primary-lighter ring-1 ring-primary/30"
                        : isSelected
                        ? "bg-primary-lighter ring-1 ring-primary/30"
                        : "bg-surface hover:bg-surface-hover",
                      isDragOver && "bg-primary-lighter ring-2 ring-primary/40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {selectionMode ? (
                        <div className="mt-0.5 flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                      ) : (
                        <Icon className="w-4 h-4 mt-0.5 text-neutral-400 flex-shrink-0" />
                      )}
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
