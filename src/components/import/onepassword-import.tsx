"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportSummary {
  total: number;
  passwords: number;
  notes: number;
}

interface ParsedItem {
  type: "password" | "note";
  name: string;
  content?: string;
  location?: string;
  account?: string;
  password?: string;
}

const BATCH_SIZE = 20;

function parseCSV(text: string): ParsedItem[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const titleIdx = header.indexOf("Title");
  const websiteIdx = header.indexOf("Website");
  const usernameIdx = header.indexOf("Username");
  const passwordIdx = header.indexOf("Password");
  const notesIdx = header.indexOf("Notes");
  const typeIdx = header.indexOf("Type");

  const items: ParsedItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser (handles quoted fields)
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const title = fields[titleIdx] || "Untitled";
    const website = fields[websiteIdx] || "";
    const username = fields[usernameIdx] || "";
    const password = fields[passwordIdx] || "";
    const notes = fields[notesIdx] || "";
    const type = fields[typeIdx] || "";

    if (type === "Login") {
      // Map to password item
      items.push({
        type: "password",
        name: title,
        location: website,
        account: username,
        password: password,
      });
    } else if (type === "Secure Note") {
      // Map to note item
      items.push({
        type: "note",
        name: title,
        content: notes,
      });
    } else {
      // Map everything else to note with all fields
      const content = [
        website && `Website: ${website}`,
        username && `Username: ${username}`,
        password && `Password: ${password}`,
        notes && `Notes: ${notes}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      items.push({
        type: "note",
        name: title,
        content: content || "No content",
      });
    }
  }

  return items;
}

export function OnePasswordImport() {
  const [status, setStatus] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendBatch = async (batchItems: ParsedItem[]) => {
    const apiItems = batchItems.map((item) => {
      if (item.type === "password") {
        return {
          type: "password",
          name: item.name,
          location: item.location,
          account: item.account,
          password: item.password,
        };
      } else {
        return {
          type: "note",
          name: item.name,
          content: item.content,
        };
      }
    });

    const response = await fetch("/api/import/yojimbo/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: apiItems }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Batch import failed");
    }
    return response.json();
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage("");

    try {
      const text = await file.text();
      const parsedItems = parseCSV(text);

      if (parsedItems.length === 0) {
        throw new Error("No valid items found in CSV file");
      }

      setItems(parsedItems);
      setStatus("preview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse CSV");
      setStatus("error");
    }
  };

  const handleImport = async () => {
    setStatus("uploading");
    setErrorMessage("");

    try {
      let totalImported = 0;
      const totalItems = items.length;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
        setProgress(
          `Importing items... batch ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, totalItems)}/${totalItems})`
        );

        const batchResult = await sendBatch(batch);
        totalImported += batchResult.imported || 0;
      }

      const passwords = items.filter((i) => i.type === "password").length;
      const notes = items.filter((i) => i.type === "note").length;

      setSummary({
        total: totalImported,
        passwords,
        notes,
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
      handleFileSelect(file);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">Import from 1Password</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Upload your 1Password CSV export file. Logins and secure notes will be imported.
        The file is parsed locally in your browser.
      </p>

      {status === "idle" && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-3" />
          <p className="text-sm text-neutral-500 mb-1">Click to select your 1Password CSV export</p>
          <p className="text-xs text-neutral-400">.csv file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {status === "preview" && (
        <div className="border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-2">Preview</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Found {items.length} items ({items.filter((i) => i.type === "password").length} passwords,{" "}
            {items.filter((i) => i.type === "note").length} notes)
          </p>
          <Button onClick={handleImport} className="w-full">
            Import Items
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
              <dt className="text-neutral-500">Total items imported</dt>
              <dd className="font-medium text-green-600">{summary.total}</dd>
            </div>
            <div className="flex justify-between pl-4">
              <dt className="text-neutral-500">Passwords</dt>
              <dd>{summary.passwords}</dd>
            </div>
            <div className="flex justify-between pl-4">
              <dt className="text-neutral-500">Notes</dt>
              <dd>{summary.notes}</dd>
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
