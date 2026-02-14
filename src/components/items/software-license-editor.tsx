"use client";

import { Input } from "@/components/ui/input";

interface SoftwareLicenseEditorProps {
  licenseKey: string;
  licenseTo: string;
  email: string;
  purchaseDate: string;
  notes: string;
  onLicenseKeyChange: (value: string) => void;
  onLicenseToChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPurchaseDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  disabled?: boolean;
}

export function SoftwareLicenseEditor({
  licenseKey,
  licenseTo,
  email,
  purchaseDate,
  notes,
  onLicenseKeyChange,
  onLicenseToChange,
  onEmailChange,
  onPurchaseDateChange,
  onNotesChange,
  disabled,
}: SoftwareLicenseEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          License Key
        </label>
        <Input
          value={licenseKey}
          onChange={(e) => onLicenseKeyChange(e.target.value)}
          placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
          disabled={disabled}
          className="font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Licensed To
        </label>
        <Input
          value={licenseTo}
          onChange={(e) => onLicenseToChange(e.target.value)}
          placeholder="(optional)"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="(optional)"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Purchase Date
        </label>
        <Input
          type="date"
          value={purchaseDate}
          onChange={(e) => onPurchaseDateChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional notes (optional)"
          disabled={disabled}
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
