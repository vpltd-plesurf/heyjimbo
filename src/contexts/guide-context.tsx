"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface GuideContextValue {
  isEnabled: boolean;
  setEnabled: (v: boolean) => void;
  dismissedTips: Set<string>;
  dismissTip: (id: string) => void;
  dismissAll: () => void;
  resetAll: () => void;
  shouldShowTip: (id: string) => boolean;
}

const STORAGE_KEY = "heyjimbo-guide";

interface StoredGuide {
  enabled: boolean;
  dismissed: string[];
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredGuide = JSON.parse(stored);
        setIsEnabled(data.enabled);
        setDismissedTips(new Set(data.dismissed));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    const data: StoredGuide = {
      enabled: isEnabled,
      dismissed: Array.from(dismissedTips),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [isEnabled, dismissedTips, loaded]);

  const setEnabled = useCallback((v: boolean) => setIsEnabled(v), []);

  const dismissTip = useCallback((id: string) => {
    setDismissedTips((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const allTips = ["new-item", "filters", "search", "item-flag", "item-trash", "labels", "folders"];
    setDismissedTips(new Set(allTips));
  }, []);

  const resetAll = useCallback(() => {
    setDismissedTips(new Set());
  }, []);

  const shouldShowTip = useCallback(
    (id: string) => isEnabled && !dismissedTips.has(id),
    [isEnabled, dismissedTips]
  );

  return (
    <GuideContext.Provider
      value={{ isEnabled, setEnabled, dismissedTips, dismissTip, dismissAll, resetAll, shouldShowTip }}
    >
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide must be used within a GuideProvider");
  return ctx;
}
