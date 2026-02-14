"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Item } from "@/types/item";
import { isDemoMode } from "@/lib/demo";
import { useItemsDemo } from "./use-items-demo";

interface CreateItemData {
  name?: string;
  type?: string;
  content?: string;
  parent_folder_id?: string | null;
}

interface UpdateItemData {
  name?: string;
  is_flagged?: boolean;
  is_trashed?: boolean;
  content?: string;
  content_format?: string;
  bookmark_url?: string;
  bookmark_source_url?: string;
  pw_location?: string;
  pw_account?: string;
  pw_password?: string;
  sn_serial_number?: string;
  sn_owner_name?: string;
  sn_owner_email?: string;
  sn_organization?: string;
  sl_license_key?: string;
  sl_license_to?: string;
  sl_email?: string;
  sl_purchase_date?: string | null;
  sl_notes?: string;
  parent_folder_id?: string | null;
}

export function useItems(filter: string, searchQuery: string, currentFolderId?: string | null) {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- isDemoMode() is a build-time constant
  if (isDemoMode()) return useItemsDemo(filter, searchQuery);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Build query params based on filter
  const buildQueryParams = useCallback((cursor?: string) => {
    const params = new URLSearchParams();

    if (filter === "note" || filter === "bookmark" || filter === "password" || filter === "serial_number" || filter === "software_license") {
      params.set("type", filter);
    } else if (filter === "flagged") {
      params.set("flagged", "true");
    } else if (filter === "trash") {
      params.set("trashed", "true");
    } else if (filter.startsWith("label:")) {
      params.set("label", filter.slice(6));
    }

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (currentFolderId) {
      params.set("folder", currentFolderId);
    }

    if (cursor) {
      params.set("cursor", cursor);
    }

    return params.toString();
  }, [filter, searchQuery, currentFolderId]);

  // Abort controller ref to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch items (initial or reset)
  const fetchItems = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const queryString = buildQueryParams();
      const url = `/api/items${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Error fetching items:", error);
      setItems([]);
      setNextCursor(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [buildQueryParams]);

  // Fetch more items (append)
  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const queryString = buildQueryParams(nextCursor);
      const url = `/api/items?${queryString}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch more items");
      }

      const data = await response.json();
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Error fetching more items:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildQueryParams]);

  // Initial fetch and refetch on filter/search change
  useEffect(() => {
    fetchItems();
    return () => abortControllerRef.current?.abort();
  }, [fetchItems]);

  // Create item
  const createItem = useCallback(async (data: CreateItemData) => {
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create item");
      }

      const newItem = await response.json();
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    } catch (error) {
      console.error("Error creating item:", error);
      return null;
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (id: string, data: UpdateItemData) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      const updatedItem = await response.json();

      setItems((prev) => {
        if (data.is_trashed === true && filter !== "trash") {
          return prev.filter((item) => item.id !== id);
        }
        if (data.is_trashed === false && filter === "trash") {
          return prev.filter((item) => item.id !== id);
        }
        return prev.map((item) => (item.id === id ? updatedItem : item));
      });

      return updatedItem;
    } catch (error) {
      console.error("Error updating item:", error);
      return null;
    }
  }, [filter]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      return false;
    }
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore: !!nextCursor,
    createItem,
    updateItem,
    deleteItem,
    fetchMore,
    refetch: fetchItems,
  };
}
