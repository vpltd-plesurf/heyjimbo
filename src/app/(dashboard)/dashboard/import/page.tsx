"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileArchive, KeyRound, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YojimboImport } from "@/components/import/yojimbo-import";
import { OnePasswordImport } from "@/components/import/onepassword-import";
import { AppleNotesImport } from "@/components/import/apple-notes-import";

const importSources = [
  {
    id: "yojimbo",
    name: "Yojimbo",
    description: "Import from Yojimbo backup ZIP file",
    format: ".yojimbo ZIP",
    icon: FileArchive,
  },
  {
    id: "1password",
    name: "1Password",
    description: "Import logins and secure notes from CSV export",
    format: ".csv",
    icon: KeyRound,
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Import notes from exported HTML files",
    format: ".html files",
    icon: StickyNote,
  },
];

export default function ImportPage() {
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (activeSource ? setActiveSource(null) : router.push("/dashboard"))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {activeSource
              ? importSources.find((s) => s.id === activeSource)?.name + " Import"
              : "Import"}
          </h1>
        </div>

        {!activeSource ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {importSources.map((source) => {
              const Icon = source.icon;
              return (
                <button
                  key={source.id}
                  onClick={() => setActiveSource(source.id)}
                  className="bg-surface rounded-2xl p-6 border border-border shadow-card hover:shadow-card-hover transition-all duration-200 text-left"
                >
                  <Icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">{source.name}</h3>
                  <p className="text-sm text-neutral-500 mb-2">{source.description}</p>
                  <span className="text-xs text-neutral-400 bg-surface-secondary px-2 py-1 rounded-lg">
                    {source.format}
                  </span>
                </button>
              );
            })}
          </div>
        ) : activeSource === "yojimbo" ? (
          <YojimboImport />
        ) : activeSource === "1password" ? (
          <OnePasswordImport />
        ) : activeSource === "apple-notes" ? (
          <AppleNotesImport />
        ) : null}
      </div>
    </div>
  );
}
