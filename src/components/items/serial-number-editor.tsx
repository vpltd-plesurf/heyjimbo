"use client";

import { Input } from "@/components/ui/input";

interface SerialNumberEditorProps {
  serialNumber: string;
  ownerName: string;
  ownerEmail: string;
  organization: string;
  onSerialNumberChange: (value: string) => void;
  onOwnerNameChange: (value: string) => void;
  onOwnerEmailChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  disabled?: boolean;
}

export function SerialNumberEditor({
  serialNumber,
  ownerName,
  ownerEmail,
  organization,
  onSerialNumberChange,
  onOwnerNameChange,
  onOwnerEmailChange,
  onOrganizationChange,
  disabled,
}: SerialNumberEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Serial Number
        </label>
        <Input
          value={serialNumber}
          onChange={(e) => onSerialNumberChange(e.target.value)}
          placeholder="e.g. XXXX-XXXX-XXXX-XXXX"
          disabled={disabled}
          className="font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Owner Name
        </label>
        <Input
          value={ownerName}
          onChange={(e) => onOwnerNameChange(e.target.value)}
          placeholder="(optional)"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Owner Email
        </label>
        <Input
          type="email"
          value={ownerEmail}
          onChange={(e) => onOwnerEmailChange(e.target.value)}
          placeholder="(optional)"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Organization
        </label>
        <Input
          value={organization}
          onChange={(e) => onOrganizationChange(e.target.value)}
          placeholder="(optional)"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
