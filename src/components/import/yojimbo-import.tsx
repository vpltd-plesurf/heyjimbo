"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseYojimboZip, type YojimboItem, type YojimboLabel } from "@/lib/import/yojimbo-parser";

interface ImportSummary {
  total: number;
  imported: number;
  encrypted: number;
  actuallyImported: number;
  labelsImported: number;
  byType: Record<string, number>;
}

const BATCH_SIZE = 20;

export function YojimboImport() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendBatch = async (body: { items?: YojimboItem[]; labels?: YojimboLabel[] }) => {
    const response = await fetch("/api/import/yojimbo/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Batch import failed");
    }
    return response.json();
  };

  const handleUpload = async (file: File) => {
    setStatus("uploading");
    setErrorMessage("");
    setProgress("Reading ZIP file...");

    try {
      // 1. Parse ZIP client-side
      const buffer = await file.arrayBuffer();
      setProgress("Parsing database...");
      const result = await parseYojimboZip(buffer);

      // 2. Send labels first
      let labelsImported = 0;
      if (result.labels.length > 0) {
        setProgress(`Importing ${result.labels.length} labels...`);
        await sendBatch({ labels: result.labels });
        labelsImported = result.labels.length;
      }

      // 3. Send items in batches
      let totalImported = 0;
      const totalItems = result.items.length;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = result.items.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
        setProgress(`Importing items... batch ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, totalItems)}/${totalItems})`);

        const batchResult = await sendBatch({ items: batch });
        totalImported += batchResult.imported || 0;
      }

      // 4. Show summary
      setSummary({
        total: result.summary.total,
        imported: result.summary.imported,
        encrypted: result.summary.encrypted,
        actuallyImported: totalImported,
        labelsImported,
        byType: result.summary.byType,
      });
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed");
      setStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Import from Yojimbo
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Upload your Yojimbo backup ZIP file to import your items and labels.
        The file is parsed locally in your browser — only item data is sent to the server.
      </p>

      {status === "idle" && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-3" />
          <p className="text-sm text-neutral-500 mb-1">
            Click to select your Yojimbo backup ZIP
          </p>
          <p className="text-xs text-neutral-400">
            .zip file containing Database.sqlite
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {status === "uploading" && (
        <div className="border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-primary mb-3 animate-spin" />
          <p className="text-sm text-neutral-500">
            {progress}
          </p>
        </div>
      )}

      {status === "success" && summary && (
        <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-300">
              Import Complete
            </span>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Total items found</dt>
              <dd className="font-medium">{summary.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Items imported</dt>
              <dd className="font-medium text-green-600">{summary.actuallyImported}</dd>
            </div>
            {summary.encrypted > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Encrypted (skipped)</dt>
                <dd className="font-medium text-amber-600">{summary.encrypted}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Labels imported</dt>
              <dd className="font-medium">{summary.labelsImported}</dd>
            </div>
            {Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between pl-4">
                <dt className="text-neutral-500 capitalize">{type.replace("_", " ")}s</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => window.location.href = "/dashboard"}
          >
            Go to Dashboard
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="border border-red-200 dark:border-red-800 rounded-xl p-6 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-300">
              Import Failed
            </span>
          </div>
          <p className="text-sm text-rose mb-4">
            {errorMessage}
          </p>
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
