"use client";

import { createContext, useContext } from "react";
import { isDemoMode } from "@/lib/demo";

const DemoContext = createContext(false);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const isDemo = isDemoMode();
  return <DemoContext.Provider value={isDemo}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  return useContext(DemoContext);
}
