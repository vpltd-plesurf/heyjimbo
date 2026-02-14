"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Label } from "@/types/item";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#6b7280",
];

interface LabelManagerProps {
  labels: Label[];
  onCreateLabel: (data: { name: string; color: string }) => Promise<Label | null>;
  onUpdateLabel: (id: string, data: { name?: string; color?: string }) => Promise<Label | null>;
  onDeleteLabel: (id: string) => Promise<boolean>;
  onClose: () => void;
}

export function LabelManager({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onClose,
}: LabelManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateLabel({ name: newName.trim(), color: newColor });
    setNewName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdateLabel(id, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface rounded-2xl shadow-card-hover p-6 w-[360px] max-h-[80vh] overflow-y-auto border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Manage Labels
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Create new label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            {PRESET_COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New label"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Label list */}
        <div className="space-y-1">
          {labels.map((label) =>
            editingId === label.id ? (
              <div key={label.id} className="flex items-center gap-2 p-1">
                <div className="flex gap-1">
                  {PRESET_COLORS.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${editColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(label.id)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleUpdate(label.id)}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingId(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div
                key={label.id}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-hover transition-colors duration-150 group"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-sm text-foreground">
                  {label.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  onClick={() => startEdit(label)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-red-500"
                  onClick={() => onDeleteLabel(label.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
