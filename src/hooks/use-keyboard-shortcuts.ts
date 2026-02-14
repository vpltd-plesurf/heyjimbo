"use client";

import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onNewItem: () => void;
  onFocusSearch: () => void;
  onTrashSelected: () => void;
  onToggleFlag: () => void;
  onEscape: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (target.getAttribute("contenteditable") === "true") return true;
  if (target.closest("[contenteditable='true']")) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Escape always works
      if (e.key === "Escape") {
        handlers.onEscape();
        return;
      }

      // Cmd+N — new item (works everywhere)
      if (meta && e.key === "n") {
        e.preventDefault();
        handlers.onNewItem();
        return;
      }

      // Cmd+F — focus search (works everywhere)
      if (meta && e.key === "f") {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      // Cmd+Shift+F — toggle flag (works everywhere)
      if (meta && e.shiftKey && e.key === "F") {
        e.preventDefault();
        handlers.onToggleFlag();
        return;
      }

      // Skip remaining shortcuts when typing in an editor
      if (isEditableTarget(e.target)) return;

      // Backspace / Delete — trash selected item
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handlers.onTrashSelected();
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handlers.onNavigateUp();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handlers.onNavigateDown();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
