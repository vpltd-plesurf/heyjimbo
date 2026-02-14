"use client";

import { Input } from "@/components/ui/input";

interface BookmarkEditorProps {
  url: string;
  sourceUrl: string;
  onUrlChange: (url: string) => void;
  onSourceUrlChange: (sourceUrl: string) => void;
  disabled?: boolean;
}

export function BookmarkEditor({
  url,
  sourceUrl,
  onUrlChange,
  onSourceUrlChange,
  disabled,
}: BookmarkEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          URL
        </label>
        <Input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source URL
        </label>
        <Input
          type="url"
          value={sourceUrl}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          placeholder="https://source.example.com (optional)"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
