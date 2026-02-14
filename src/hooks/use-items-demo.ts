"use client";

import { useState, useEffect, useCallback } from "react";
import type { Item } from "@/types/item";
import { DEMO_SEED_ITEMS } from "@/lib/demo-seed";

const STORAGE_KEY = "heyjimbo-demo-items";

function loadItems(): Item[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_SEED_ITEMS));
    return [...DEMO_SEED_ITEMS];
  }
  return JSON.parse(raw);
}

function saveItems(items: Item[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface CreateItemData {
  name?: string;
  type?: string;
  content?: string;
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
}

export function useItemsDemo(filter: string, searchQuery: string) {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    setAllItems(loadItems());
    setLoading(false);
  }, []);

  // Filter items to match the API route behavior
  const items = allItems
    .filter((item) => {
      if (filter === "trash") return item.is_trashed;
      if (item.is_trashed) return false;
      if (filter === "note") return item.type === "note";
      if (filter === "bookmark") return item.type === "bookmark";
      if (filter === "password") return item.type === "password";
      if (filter === "serial_number") return item.type === "serial_number";
      if (filter === "flagged") return item.is_flagged;
      if (filter.startsWith("label:")) {
        return true;
      }
      return true;
    })
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.note_content?.content?.toLowerCase().includes(q) ?? false) ||
        (item.bookmark_content?.url?.toLowerCase().includes(q) ?? false) ||
        (item.password_content?.location?.toLowerCase().includes(q) ?? false) ||
        (item.password_content?.account?.toLowerCase().includes(q) ?? false) ||
        (item.serial_number_content?.serial_number?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  const createItem = useCallback(
    async (data: CreateItemData): Promise<Item | null> => {
      const now = new Date().toISOString();
      const type = data.type || "note";
      const newItem: Item = {
        id: `demo-${Date.now()}`,
        name: data.name || "Untitled",
        type,
        is_flagged: false,
        is_trashed: false,
        created_at: now,
        updated_at: now,
        note_content:
          type === "note"
            ? { content: data.content || "", content_format: "html" }
            : null,
        bookmark_content:
          type === "bookmark"
            ? { url: "", source_url: "" }
            : null,
        password_content:
          type === "password"
            ? { location: "", account: "", password: "" }
            : null,
        serial_number_content:
          type === "serial_number"
            ? { serial_number: "", owner_name: "", owner_email: "", organization: "" }
            : null,
      };
      const updated = [newItem, ...allItems];
      setAllItems(updated);
      saveItems(updated);
      return newItem;
    },
    [allItems]
  );

  const updateItem = useCallback(
    async (id: string, data: UpdateItemData): Promise<Item | null> => {
      const now = new Date().toISOString();
      let updatedItem: Item | null = null;

      const updated = allItems.map((item) => {
        if (item.id !== id) return item;

        const newItem: Item = {
          ...item,
          updated_at: now,
        };

        if (data.name !== undefined) newItem.name = data.name;
        if (data.is_flagged !== undefined) newItem.is_flagged = data.is_flagged;
        if (data.is_trashed !== undefined) newItem.is_trashed = data.is_trashed;

        // Note content
        if (data.content !== undefined && newItem.note_content) {
          newItem.note_content = {
            ...newItem.note_content,
            content: data.content,
          };
        }
        if (data.content_format !== undefined && newItem.note_content) {
          newItem.note_content = {
            ...newItem.note_content,
            content_format: data.content_format,
          };
        }

        // Bookmark content
        if (newItem.bookmark_content) {
          if (data.bookmark_url !== undefined) {
            newItem.bookmark_content = { ...newItem.bookmark_content, url: data.bookmark_url };
          }
          if (data.bookmark_source_url !== undefined) {
            newItem.bookmark_content = { ...newItem.bookmark_content, source_url: data.bookmark_source_url };
          }
        }

        // Password content
        if (newItem.password_content) {
          if (data.pw_location !== undefined) {
            newItem.password_content = { ...newItem.password_content, location: data.pw_location };
          }
          if (data.pw_account !== undefined) {
            newItem.password_content = { ...newItem.password_content, account: data.pw_account };
          }
          if (data.pw_password !== undefined) {
            newItem.password_content = { ...newItem.password_content, password: data.pw_password };
          }
        }

        // Serial number content
        if (newItem.serial_number_content) {
          if (data.sn_serial_number !== undefined) {
            newItem.serial_number_content = { ...newItem.serial_number_content, serial_number: data.sn_serial_number };
          }
          if (data.sn_owner_name !== undefined) {
            newItem.serial_number_content = { ...newItem.serial_number_content, owner_name: data.sn_owner_name };
          }
          if (data.sn_owner_email !== undefined) {
            newItem.serial_number_content = { ...newItem.serial_number_content, owner_email: data.sn_owner_email };
          }
          if (data.sn_organization !== undefined) {
            newItem.serial_number_content = { ...newItem.serial_number_content, organization: data.sn_organization };
          }
        }

        updatedItem = newItem;
        return newItem;
      });

      setAllItems(updated);
      saveItems(updated);
      return updatedItem;
    },
    [allItems]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      const updated = allItems.filter((item) => item.id !== id);
      setAllItems(updated);
      saveItems(updated);
      return true;
    },
    [allItems]
  );

  const refetch = useCallback(async () => {
    setAllItems(loadItems());
  }, []);

  return {
    items,
    loading,
    loadingMore: false,
    hasMore: false,
    createItem,
    updateItem,
    deleteItem,
    fetchMore: async () => {},
    refetch,
  };
}
