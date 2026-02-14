"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelBadge } from "./label-badge";
import type { Label } from "@/types/item";

interface LabelPickerProps {
  allLabels: Label[];
  assignedLabels: Label[];
  onAssign: (labelId: string) => void;
  onRemove: (labelId: string) => void;
}

export function LabelPicker({
  allLabels,
  assignedLabels,
  onAssign,
  onRemove,
}: LabelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const assignedIds = new Set(assignedLabels.map((l) => l.id));
  const unassigned = allLabels.filter((l) => !assignedIds.has(l.id));

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Labels"
      >
        <Tag className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-card-hover p-2 min-w-[180px]">
            {assignedLabels.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-xs text-neutral-400 font-medium px-1">
                  Assigned
                </p>
                {assignedLabels.map((label) => (
                  <div key={label.id} className="px-1">
                    <LabelBadge
                      label={label}
                      onRemove={() => onRemove(label.id)}
                    />
                  </div>
                ))}
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="space-y-0.5">
                {assignedLabels.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}
                <p className="text-xs text-neutral-400 font-medium px-1">
                  Add label
                </p>
                {unassigned.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => {
                      onAssign(label.id);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded-xl hover:bg-surface-hover transition-colors duration-150 text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </button>
                ))}
              </div>
            )}

            {allLabels.length === 0 && (
              <p className="text-xs text-neutral-400 px-1">No labels available</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
