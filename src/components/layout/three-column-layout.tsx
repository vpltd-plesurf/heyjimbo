"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { ItemList, type Item } from "./item-list";
import { ItemDetail } from "./item-detail";
import { useItems } from "@/hooks/use-items";
import { useLabels } from "@/hooks/use-labels";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function ThreeColumnLayout() {
  const [currentFilter, setCurrentFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { items, loading, loadingMore, hasMore, createItem, updateItem, deleteItem, fetchMore, refetch } =
    useItems(currentFilter, debouncedSearch);

  const {
    labels: allLabels,
    assignLabel,
    removeLabel,
    getLabelsForItem,
  } = useLabels();

  // Find the selected item and enrich with labels
  const rawSelectedItem = items.find((item) => item.id === selectedId) || null;
  const selectedItem = rawSelectedItem
    ? {
        ...rawSelectedItem,
        labels: rawSelectedItem.labels?.length
          ? rawSelectedItem.labels
          : getLabelsForItem(rawSelectedItem.id),
      }
    : null;

  // Enrich all items with labels for display
  const enrichedItems = items.map((item) => ({
    ...item,
    labels: item.labels?.length ? item.labels : getLabelsForItem(item.id),
  }));

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedId(null);
  }, [currentFilter]);

  // Handle creating a new item
  const handleNewItem = async (type: string = "note") => {
    // Switch away from trash view so the new item is visible
    if (currentFilter === "trash") {
      setCurrentFilter("all");
    }
    const newItem = await createItem({ name: "Untitled", type });
    if (newItem) {
      setSelectedId(newItem.id);
    }
  };

  // Handle updating an item
  const handleUpdate = useCallback(
    async (id: string, updates: Partial<Item & { content?: string }>) => {
      await updateItem(id, updates);
      // If item was trashed, clear selection
      if (updates.is_trashed) {
        setSelectedId(null);
      }
    },
    [updateItem]
  );

  // Handle deleting an item
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem(id);
      setSelectedId(null);
    },
    [deleteItem]
  );

  // Handle closing detail view
  const handleCloseDetail = () => {
    setSelectedId(null);
  };

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      onNewItem: handleNewItem,
      onFocusSearch: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
      onTrashSelected: () => {
        if (selectedId && currentFilter !== "trash") {
          handleUpdate(selectedId, { is_trashed: true });
        }
      },
      onToggleFlag: () => {
        if (selectedId && selectedItem) {
          handleUpdate(selectedId, { is_flagged: !selectedItem.is_flagged });
        }
      },
      onEscape: handleCloseDetail,
      onNavigateUp: () => {
        if (items.length === 0) return;
        const currentIndex = items.findIndex((i) => i.id === selectedId);
        if (currentIndex > 0) {
          setSelectedId(items[currentIndex - 1].id);
        } else if (currentIndex === -1) {
          setSelectedId(items[items.length - 1].id);
        }
      },
      onNavigateDown: () => {
        if (items.length === 0) return;
        const currentIndex = items.findIndex((i) => i.id === selectedId);
        if (currentIndex < items.length - 1) {
          setSelectedId(items[currentIndex + 1].id);
        } else if (currentIndex === -1) {
          setSelectedId(items[0].id);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, selectedItem, items, currentFilter, handleUpdate]
  );

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Navigation */}
      <div className="w-56 flex-shrink-0">
        <Sidebar
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          onNewItem={handleNewItem}
        />
      </div>

      {/* Item List */}
      <div className="w-72 flex-shrink-0">
        <ItemList
          items={enrichedItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          loading={loading}
          searchInputRef={searchInputRef}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={fetchMore}
        />
      </div>

      {/* Item Detail */}
      <ItemDetail
        item={selectedItem}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClose={handleCloseDetail}
        allLabels={allLabels}
        onAssignLabel={(itemId, labelId) => {
          assignLabel(itemId, labelId);
          refetch();
        }}
        onRemoveLabel={(itemId, labelId) => {
          removeLabel(itemId, labelId);
          refetch();
        }}
      />
    </div>
  );
}
