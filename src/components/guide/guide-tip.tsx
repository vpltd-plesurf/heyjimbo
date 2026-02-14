"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useGuide } from "@/contexts/guide-context";

interface GuideTipProps {
  tipId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function GuideTip({
  tipId,
  title,
  description,
  position = "bottom",
  children,
}: GuideTipProps) {
  const { shouldShowTip, dismissTip } = useGuide();
  const show = shouldShowTip(tipId);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-0 mb-2",
    bottom: "top-full left-0 mt-2",
    left: "right-full top-0 mr-2",
    right: "left-full top-0 ml-2",
  };

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]} w-56`}
          >
            <div className="bg-primary-lighter border border-primary/20 rounded-xl shadow-card p-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground">{title}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTip(tipId);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors duration-150 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">{description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissTip(tipId);
                }}
                className="text-xs text-primary font-medium mt-2 hover:text-primary/80 transition-colors duration-150"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
