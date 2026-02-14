"use client";

import { useState, useEffect, useCallback } from "react";
import type { Label } from "@/types/item";
import { isDemoMode } from "@/lib/demo";
import { useLabelsDemo } from "./use-labels-demo";

export function useLabels() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- isDemoMode() is a build-time constant
  if (isDemoMode()) return useLabelsDemo();

  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(data);
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const createLabel = useCallback(
    async (data: { name: string; color: string }): Promise<Label | null> => {
      try {
        const response = await fetch("/api/labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) return null;
        const newLabel = await response.json();
        setLabels((prev) => [...prev, newLabel]);
        return newLabel;
      } catch (error) {
        console.error("Error creating label:", error);
        return null;
      }
    },
    []
  );

  const updateLabel = useCallback(
    async (id: string, data: { name?: string; color?: string }): Promise<Label | null> => {
      try {
        const response = await fetch(`/api/labels/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) return null;
        const updated = await response.json();
        setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
        return updated;
      } catch (error) {
        console.error("Error updating label:", error);
        return null;
      }
    },
    []
  );

  const deleteLabel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/labels/${id}`, { method: "DELETE" });
      if (!response.ok) return false;
      setLabels((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch (error) {
      console.error("Error deleting label:", error);
      return false;
    }
  }, []);

  const assignLabel = useCallback(
    async (itemId: string, labelId: string) => {
      try {
        await fetch(`/api/items/${itemId}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label_id: labelId }),
        });
      } catch (error) {
        console.error("Error assigning label:", error);
      }
    },
    []
  );

  const removeLabel = useCallback(
    async (itemId: string, labelId: string) => {
      try {
        await fetch(`/api/items/${itemId}/labels`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label_id: labelId }),
        });
      } catch (error) {
        console.error("Error removing label:", error);
      }
    },
    []
  );

  const getLabelsForItem = useCallback(
    (_itemId: string): Label[] => {
      // In non-demo mode, labels come from the API response on items
      return [];
    },
    []
  );

  const getItemIdsForLabel = useCallback(
    (_labelId: string): string[] => {
      // In non-demo mode, filtering is handled by the API
      return [];
    },
    []
  );

  return {
    labels,
    loading,
    createLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeLabel,
    getLabelsForItem,
    getItemIdsForLabel,
  };
}
