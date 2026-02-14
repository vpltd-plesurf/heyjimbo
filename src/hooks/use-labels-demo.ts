"use client";

import { useState, useEffect, useCallback } from "react";
import type { Label } from "@/types/item";

const LABELS_KEY = "heyjimbo-demo-labels";
const ITEM_LABELS_KEY = "heyjimbo-demo-item-labels";

const DEFAULT_LABELS: Label[] = [
  { id: "label-001", name: "Personal", color: "#3b82f6" },
  { id: "label-002", name: "Work", color: "#10b981" },
  { id: "label-003", name: "Important", color: "#ef4444" },
];

function loadLabels(): Label[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LABELS_KEY);
  if (!raw) {
    localStorage.setItem(LABELS_KEY, JSON.stringify(DEFAULT_LABELS));
    return [...DEFAULT_LABELS];
  }
  return JSON.parse(raw);
}

function saveLabels(labels: Label[]) {
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

// Item-label assignments: { [itemId]: labelId[] }
function loadItemLabels(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(ITEM_LABELS_KEY);
  if (!raw) return {};
  return JSON.parse(raw);
}

function saveItemLabels(assignments: Record<string, string[]>) {
  localStorage.setItem(ITEM_LABELS_KEY, JSON.stringify(assignments));
}

export function useLabelsDemo() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [itemLabels, setItemLabels] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLabels(loadLabels());
    setItemLabels(loadItemLabels());
    setLoading(false);
  }, []);

  const createLabel = useCallback(
    async (data: { name: string; color: string }): Promise<Label | null> => {
      const newLabel: Label = {
        id: `label-${Date.now()}`,
        name: data.name,
        color: data.color,
      };
      const updated = [...labels, newLabel];
      setLabels(updated);
      saveLabels(updated);
      return newLabel;
    },
    [labels]
  );

  const updateLabel = useCallback(
    async (id: string, data: { name?: string; color?: string }): Promise<Label | null> => {
      const updated = labels.map((l) =>
        l.id === id ? { ...l, ...data } : l
      );
      setLabels(updated);
      saveLabels(updated);
      return updated.find((l) => l.id === id) || null;
    },
    [labels]
  );

  const deleteLabel = useCallback(
    async (id: string): Promise<boolean> => {
      const updated = labels.filter((l) => l.id !== id);
      setLabels(updated);
      saveLabels(updated);
      // Remove from all item assignments
      const updatedAssignments = { ...itemLabels };
      for (const itemId of Object.keys(updatedAssignments)) {
        updatedAssignments[itemId] = updatedAssignments[itemId].filter(
          (lid) => lid !== id
        );
      }
      setItemLabels(updatedAssignments);
      saveItemLabels(updatedAssignments);
      return true;
    },
    [labels, itemLabels]
  );

  const assignLabel = useCallback(
    async (itemId: string, labelId: string) => {
      const current = itemLabels[itemId] || [];
      if (current.includes(labelId)) return;
      const updated = { ...itemLabels, [itemId]: [...current, labelId] };
      setItemLabels(updated);
      saveItemLabels(updated);
    },
    [itemLabels]
  );

  const removeLabel = useCallback(
    async (itemId: string, labelId: string) => {
      const current = itemLabels[itemId] || [];
      const updated = {
        ...itemLabels,
        [itemId]: current.filter((lid) => lid !== labelId),
      };
      setItemLabels(updated);
      saveItemLabels(updated);
    },
    [itemLabels]
  );

  const getLabelsForItem = useCallback(
    (itemId: string): Label[] => {
      const labelIds = itemLabels[itemId] || [];
      return labels.filter((l) => labelIds.includes(l.id));
    },
    [labels, itemLabels]
  );

  const getItemIdsForLabel = useCallback(
    (labelId: string): string[] => {
      return Object.entries(itemLabels)
        .filter(([, ids]) => ids.includes(labelId))
        .map(([itemId]) => itemId);
    },
    [itemLabels]
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
