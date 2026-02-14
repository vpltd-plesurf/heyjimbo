"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./sidebar";
import { ItemList, type Item } from "./item-list";
import { ItemDetail } from "./item-detail";
import { useItems } from "@/hooks/use-items";
import { useLabels } from "@/hooks/use-labels";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Menu, ArrowLeft, ChevronRight } from "lucide-react";

type MobileView = "sidebar" | "list" | "detail";
type ViewportSize = "mobile" | "tablet" | "desktop";

interface FolderBreadcrumb {
  id: string;
  name: string;
}

export function ThreeColumnLayout() {
  const [currentFilter, setCurrentFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [viewportSize, setViewportSize] = useState<ViewportSize>("desktop");
  const [showSidebar, setShowSidebar] = useState(false);
  const [folderStack, setFolderStack] = useState<FolderBreadcrumb[]>([]);

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
  const isMobile = viewportSize === "mobile";
  const isTablet = viewportSize === "tablet";

  // Detect viewport size
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 768) setViewportSize("mobile");
      else if (w < 1024) setViewportSize("tablet");
      else setViewportSize("desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { items, loading, loadingMore, hasMore, createItem, updateItem, deleteItem, fetchMore, refetch } =
    useItems(currentFilter, debouncedSearch, currentFolderId);

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
    setFolderStack([]);
    if (isMobile) setMobileView("list");
  }, [currentFilter, isMobile]);

  // Navigate into a folder
  const handleOpenFolder = (folderId: string, folderName: string) => {
    setFolderStack((prev) => [...prev, { id: folderId, name: folderName }]);
    setSelectedId(null);
  };

  // Navigate back to a breadcrumb level
  const handleBreadcrumbNav = (index: number) => {
    if (index === -1) {
      setFolderStack([]);
    } else {
      setFolderStack((prev) => prev.slice(0, index + 1));
    }
    setSelectedId(null);
  };

  // Handle creating a new item
  const handleNewItem = async (type: string = "note") => {
    if (currentFilter === "trash") {
      setCurrentFilter("all");
    }
    const newItem = await createItem({
      name: type === "folder" ? "New Folder" : "Untitled",
      type,
      parent_folder_id: currentFolderId,
    });
    if (newItem) {
      if (type !== "folder") {
        setSelectedId(newItem.id);
        if (isMobile) setMobileView("detail");
      }
    }
  };

  // Handle selecting an item — click folders to open
  const handleSelect = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.type === "folder") {
      handleOpenFolder(id, item.name);
      return;
    }
    setSelectedId(id);
    if (isMobile) setMobileView("detail");
  };

  // Handle updating an item
  const handleUpdate = useCallback(
    async (id: string, updates: Partial<Item & { content?: string }>) => {
      await updateItem(id, updates);
      if (updates.is_trashed) {
        setSelectedId(null);
        if (isMobile) setMobileView("list");
      }
    },
    [updateItem, isMobile]
  );

  // Handle deleting an item
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem(id);
      setSelectedId(null);
      if (isMobile) setMobileView("list");
    },
    [deleteItem, isMobile]
  );

  // Handle moving item to folder via drag & drop
  const handleMoveToFolder = useCallback(
    async (itemId: string, folderId: string) => {
      await updateItem(itemId, { parent_folder_id: folderId } as Partial<Item>);
      refetch();
    },
    [updateItem, refetch]
  );

  // Handle closing detail view
  const handleCloseDetail = () => {
    setSelectedId(null);
    if (isMobile) setMobileView("list");
  };

  // Handle sidebar filter change on mobile/tablet
  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    if (isMobile) setMobileView("list");
    if (isTablet) setShowSidebar(false);
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

  // Shared label handlers
  const labelHandlers = {
    allLabels,
    onAssignLabel: (itemId: string, labelId: string) => {
      assignLabel(itemId, labelId);
      refetch();
    },
    onRemoveLabel: (itemId: string, labelId: string) => {
      removeLabel(itemId, labelId);
      refetch();
    },
  };

  // Breadcrumb component
  const Breadcrumbs = () => {
    if (folderStack.length === 0) return null;
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-500 bg-surface-secondary border-b border-border overflow-x-auto">
        <button
          onClick={() => handleBreadcrumbNav(-1)}
          className="hover:text-foreground whitespace-nowrap transition-colors duration-150"
        >
          Root
        </button>
        {folderStack.map((folder, i) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <button
              onClick={() => handleBreadcrumbNav(i)}
              className="hover:text-foreground whitespace-nowrap transition-colors duration-150"
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <AnimatePresence mode="wait">
          {mobileView === "sidebar" && (
            <motion.div
              key="sidebar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              <Sidebar
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange}
                onNewItem={(type) => handleNewItem(type)}
              />
            </motion.div>
          )}

          {mobileView === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                <button
                  onClick={() => setMobileView("sidebar")}
                  className="p-2 rounded-xl hover:bg-surface-hover transition-colors duration-150"
                >
                  <Menu className="w-5 h-5 text-neutral-500" />
                </button>
                <span className="text-sm font-medium text-foreground capitalize">
                  {currentFilter === "all" ? "All Items" : currentFilter.replace("_", " ")}
                </span>
              </div>
              <Breadcrumbs />
              <div className="flex-1 overflow-hidden">
                <ItemList
                  items={enrichedItems}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  searchQuery={searchInput}
                  onSearchChange={setSearchInput}
                  loading={loading}
                  searchInputRef={searchInputRef}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={fetchMore}
                  onMoveToFolder={handleMoveToFolder}
                />
              </div>
            </motion.div>
          )}

          {mobileView === "detail" && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                <button
                  onClick={() => setMobileView("list")}
                  className="p-2 rounded-xl hover:bg-surface-hover transition-colors duration-150"
                >
                  <ArrowLeft className="w-5 h-5 text-neutral-500" />
                </button>
                <span className="text-sm font-medium text-foreground truncate">
                  {selectedItem?.name || "Item"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ItemDetail
                  item={selectedItem}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onClose={handleCloseDetail}
                  {...labelHandlers}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Tablet layout — sidebar as slide-over, list + detail side by side
  if (isTablet) {
    return (
      <div className="flex h-screen bg-background relative">
        {/* Slide-over sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed left-0 top-0 bottom-0 w-60 z-40 shadow-card-hover"
              >
                <Sidebar
                  currentFilter={currentFilter}
                  onFilterChange={handleFilterChange}
                  onNewItem={handleNewItem}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* List panel with menu button */}
        <div className="w-72 flex-shrink-0 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-secondary">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-xl hover:bg-surface-hover transition-colors duration-150"
            >
              <Menu className="w-5 h-5 text-neutral-500" />
            </button>
            <span className="text-sm font-medium text-foreground capitalize">
              {currentFilter === "all" ? "All Items" : currentFilter.replace("_", " ")}
            </span>
          </div>
          <Breadcrumbs />
          <div className="flex-1 overflow-hidden">
            <ItemList
              items={enrichedItems}
              selectedId={selectedId}
              onSelect={handleSelect}
              searchQuery={searchInput}
              onSearchChange={setSearchInput}
              loading={loading}
              searchInputRef={searchInputRef}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={fetchMore}
              onMoveToFolder={handleMoveToFolder}
            />
          </div>
        </div>

        {/* Detail panel */}
        <ItemDetail
          item={selectedItem}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={handleCloseDetail}
          {...labelHandlers}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Navigation */}
      <div className="w-56 flex-shrink-0">
        <Sidebar
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          onNewItem={handleNewItem}
        />
      </div>

      {/* Item List */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <Breadcrumbs />
        <div className="flex-1 overflow-hidden">
          <ItemList
            items={enrichedItems}
            selectedId={selectedId}
            onSelect={handleSelect}
            searchQuery={searchInput}
            onSearchChange={setSearchInput}
            loading={loading}
            searchInputRef={searchInputRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={fetchMore}
            onMoveToFolder={handleMoveToFolder}
          />
        </div>
      </div>

      {/* Item Detail */}
      <ItemDetail
        item={selectedItem}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClose={handleCloseDetail}
        {...labelHandlers}
      />
    </div>
  );
}
