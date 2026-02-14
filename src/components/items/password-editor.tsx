"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PasswordEditorProps {
  location: string;
  account: string;
  password: string;
  onLocationChange: (location: string) => void;
  onAccountChange: (account: string) => void;
  onPasswordChange: (password: string) => void;
  disabled?: boolean;
  isEncryptionLocked?: boolean;
  onRequestUnlock?: () => void;
}

export function PasswordEditor({
  location,
  account,
  password,
  onLocationChange,
  onAccountChange,
  onPasswordChange,
  disabled,
  isEncryptionLocked,
  onRequestUnlock,
}: PasswordEditorProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location / Website
        </label>
        <Input
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="e.g. github.com"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Account / Username
        </label>
        <Input
          value={account}
          onChange={(e) => onAccountChange(e.target.value)}
          placeholder="e.g. john@example.com"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        {isEncryptionLocked ? (
          <button
            onClick={onRequestUnlock}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Enter master password to view
          </button>
        ) : (
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••"
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
