"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParsedNote {
  name: string;
  content: string;
}

interface ImportSummary {
  total: number;
}

const BATCH_SIZE = 20;

function parseHTMLFiles(files: File[]): Promise<ParsedNote[]> {
  return Promise.all(
    files.map(async (file) => {
      const html = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const body = doc.querySelector("body");

      // Title from filename (remove .html extension)
      const name = file.name.replace(/\.html$/, "");
      const content = body?.innerHTML || "";

      return { name, content };
    })
  );
}

export function AppleNotesImport() {
  const [status, setStatus] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [notes, setNotes] = useState<ParsedNote[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendBatch = async (batchNotes: ParsedNote[]) => {
    const items = batchNotes.map((note) => ({
      type: "note",
      name: note.name,
      content: note.content,
    }));

    const response = await fetch("/api/import/yojimbo/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Batch import failed");
    }
    return response.json();
  };

  const handleFileSelect = async (files: FileList) => {
    setErrorMessage("");

    try {
      const htmlFiles = Array.from(files).filter((f) => f.name.endsWith(".html"));

      if (htmlFiles.length === 0) {
        throw new Error("No HTML files found");
      }

      const parsedNotes = await parseHTMLFiles(htmlFiles);
      setNotes(parsedNotes);
      setStatus("preview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse HTML files");
      setStatus("error");
    }
  };

  const handleImport = async () => {
    setStatus("uploading");
    setErrorMessage("");

    try {
      let totalImported = 0;
      const totalNotes = notes.length;

      for (let i = 0; i < totalNotes; i += BATCH_SIZE) {
        const batch = notes.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalNotes / BATCH_SIZE);
        setProgress(
          `Importing notes... batch ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, totalNotes)}/${totalNotes})`
        );

        const batchResult = await sendBatch(batch);
        totalImported += batchResult.imported || 0;
      }

      setSummary({
        total: totalImported,
      });
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed");
      setStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">Import from Apple Notes</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Select one or more HTML files exported from Apple Notes. Each file becomes a note.
        Files are parsed locally in your browser.
      </p>

      {status === "idle" && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-3" />
          <p className="text-sm text-neutral-500 mb-1">Click to select Apple Notes HTML files</p>
          <p className="text-xs text-neutral-400">One or more .html files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {status === "preview" && (
        <div className="border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-2">Preview</h3>
          <p className="text-sm text-neutral-500 mb-4">Found {notes.length} notes</p>
          <Button onClick={handleImport} className="w-full">
            Import Notes
          </Button>
        </div>
      )}

      {status === "uploading" && (
        <div className="border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-primary mb-3 animate-spin" />
          <p className="text-sm text-neutral-500">{progress}</p>
        </div>
      )}

      {status === "success" && summary && (
        <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-300">Import Complete</span>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Notes imported</dt>
              <dd className="font-medium text-green-600">{summary.total}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="border border-red-200 dark:border-red-800 rounded-xl p-6 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-300">Import Failed</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatus("idle");
              setErrorMessage("");
            }}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
