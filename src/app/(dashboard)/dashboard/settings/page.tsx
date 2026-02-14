"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Monitor, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";
import { useGuide } from "@/contexts/guide-context";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isEnabled, setEnabled, dismissAll, resetAll } = useGuide();

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
            <h2 className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest mb-4">
              Appearance
            </h2>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary-lighter text-primary"
                        : "bg-surface-secondary text-neutral-500 hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guide */}
          <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              <h2 className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest">
                Guide Tooltips
              </h2>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              Helpful tips that appear near features to explain what they do.
              Great for getting started or refreshing your memory.
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-foreground">Show guide tooltips</span>
              <button
                onClick={() => setEnabled(!isEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  isEnabled ? "bg-primary" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                Reset all tips
              </Button>
              <Button variant="outline" size="sm" onClick={dismissAll}>
                Dismiss all tips
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
