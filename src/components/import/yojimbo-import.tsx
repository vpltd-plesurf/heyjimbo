"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportSummary {
  total: number;
  imported: number;
  encrypted: number;
  actuallyImported: number;
  labelsImported: number;
  byType: Record<string, number>;
}

export function YojimboImport() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/yojimbo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setSummary(data.summary);
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Import from Yojimbo
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Upload your Yojimbo backup ZIP file to import your items and labels.
      </p>

      {status === "idle" && (
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Click to select your Yojimbo backup ZIP
          </p>
          <p className="text-xs text-gray-400">
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
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-indigo-500 mb-3 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Importing your Yojimbo data...
          </p>
        </div>
      )}

      {status === "success" && summary && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-300">
              Import Complete
            </span>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total items found</dt>
              <dd className="font-medium">{summary.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Items imported</dt>
              <dd className="font-medium text-green-600">{summary.actuallyImported}</dd>
            </div>
            {summary.encrypted > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Encrypted (skipped)</dt>
                <dd className="font-medium text-amber-600">{summary.encrypted}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Labels imported</dt>
              <dd className="font-medium">{summary.labelsImported}</dd>
            </div>
            {Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between pl-4">
                <dt className="text-gray-500 dark:text-gray-500 capitalize">{type.replace("_", " ")}s</dt>
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
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-300">
              Import Failed
            </span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
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
