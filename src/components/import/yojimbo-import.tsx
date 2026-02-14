"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
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

const TEXT_BATCH_SIZE = 20;
const FILE_BATCH_SIZE = 3; // Smaller batches for items with binary data

export function YojimboImport() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState("");
  const [cleanImport, setCleanImport] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

    try {
      // Wipe existing data if clean import
      if (cleanImport) {
        setProgress("Wiping existing data...");
        const wipeRes = await fetch("/api/items/wipe", { method: "POST" });
        if (!wipeRes.ok) {
          throw new Error("Failed to wipe existing data");
        }
      }

      // 1. Parse ZIP client-side
      setProgress("Reading ZIP file...");
      const buffer = await file.arrayBuffer();
      setProgress("Parsing database & extracting files...");
      const result = await parseYojimboZip(buffer);

      // 2. Send labels first
      let labelsImported = 0;
      if (result.labels.length > 0) {
        setProgress(`Importing ${result.labels.length} labels...`);
        await sendBatch({ labels: result.labels });
        labelsImported = result.labels.length;
      }

      // 3. Split items into text-only and file-bearing groups
      const textItems = result.items.filter(i => !i.file_data);
      const fileItems = result.items.filter(i => i.file_data);
      const totalItems = result.items.length;
      let totalImported = 0;
      let itemsSent = 0;

      // Send text items in larger batches
      for (let i = 0; i < textItems.length; i += TEXT_BATCH_SIZE) {
        const batch = textItems.slice(i, i + TEXT_BATCH_SIZE);
        itemsSent += batch.length;
        setProgress(`Importing items... ${itemsSent}/${totalItems}`);
        const batchResult = await sendBatch({ items: batch });
        totalImported += batchResult.imported || 0;
      }

      // File items: create DB record first (without file_data), then upload file separately
      for (const fileItem of fileItems) {
        itemsSent++;
        setProgress(`Uploading file ${itemsSent}/${totalItems}: ${fileItem.name}`);

        // Strip file_data for the batch call (avoid 413)
        const { file_data, ...itemWithoutFile } = fileItem;
        const batchResult = await sendBatch({ items: [itemWithoutFile] });

        if (batchResult.imported > 0 && file_data && batchResult.itemId) {
          // Upload file via FormData to /api/attachments
          const binary = atob(file_data);
          const bytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
          const blob = new Blob([bytes], { type: fileItem.content_type || "application/octet-stream" });
          const fileName = fileItem.file_name || `${fileItem.name}.png`;

          const formData = new FormData();
          formData.append("file", blob, fileName);
          formData.append("item_id", batchResult.itemId);
          await fetch("/api/attachments", { method: "POST", body: formData });
        }

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
    if (!file) return;

    if (cleanImport) {
      setPendingFile(file);
      setShowConfirm(true);
    } else {
      handleUpload(file);
    }
  };

  const confirmAndUpload = () => {
    setShowConfirm(false);
    if (pendingFile) {
      handleUpload(pendingFile);
      setPendingFile(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Import from Yojimbo
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Upload your Yojimbo backup ZIP file to import all items — notes, bookmarks, passwords, images, and PDFs.
        The file is parsed locally in your browser.
      </p>

      {status === "idle" && (
        <>
          {/* Clean import toggle */}
          <label className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-border bg-surface cursor-pointer hover:bg-surface-hover transition-colors">
            <input
              type="checkbox"
              checked={cleanImport}
              onChange={(e) => setCleanImport(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Clean import
              </span>
              <p className="text-xs text-neutral-400 mt-0.5">
                Delete all existing items, labels, and attachments before importing
              </p>
            </div>
          </label>

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
        </>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border">
            <h3 className="font-semibold text-foreground mb-2">Delete all existing data?</h3>
            <p className="text-sm text-neutral-500 mb-4">
              This will permanently delete all your items, labels, attachments, and activity history before importing. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={confirmAndUpload}
              >
                Delete & Import
              </Button>
            </div>
          </div>
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
