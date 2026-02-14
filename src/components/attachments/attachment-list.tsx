"use client";

import { useState, useEffect, useRef } from "react";
import { Paperclip, Upload, Trash2, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ itemId }: { itemId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/attachments?item_id=${itemId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAttachments(data);
      })
      .catch(() => {});
  }, [itemId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("item_id", itemId);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const attachment = await response.json();
        setAttachments((prev) => [attachment, ...prev]);
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/attachments?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-neutral-500 hover:bg-surface-hover transition-colors duration-150"
      >
        <span className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </span>
        <span>{expanded ? "\u2212" : "+"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {/* Upload button */}
          <div className="mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 mr-1.5" />
              )}
              {uploading ? "Uploading..." : "Add File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* File list */}
          {attachments.length === 0 ? (
            <p className="text-xs text-neutral-400">No attachments</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-xl text-xs bg-surface-secondary"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate text-foreground">
                      {att.file_name}
                    </span>
                    <span className="text-neutral-400 flex-shrink-0">
                      {formatFileSize(att.file_size)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="text-neutral-400 hover:text-red-500 transition-colors duration-150 flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
