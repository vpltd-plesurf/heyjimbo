"use client";

import { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMasterPassword } from "@/contexts/master-password-context";

interface MasterPasswordDialogProps {
  onUnlocked: () => void;
}

export function MasterPasswordDialog({ onUnlocked }: MasterPasswordDialogProps) {
  const { hasMasterPassword, unlock, setupMasterPassword } = useMasterPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSetup = hasMasterPassword === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSetup) {
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const success = await setupMasterPassword(password);
        if (success) {
          onUnlocked();
        } else {
          setError("Failed to set up master password");
        }
      } else {
        const success = await unlock(password);
        if (success) {
          onUnlocked();
        } else {
          setError("Incorrect master password");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">
        {isSetup ? "Set Up Master Password" : "Enter Master Password"}
      </h3>
      <p className="text-sm text-neutral-500 text-center mb-6">
        {isSetup
          ? "Create a master password to encrypt your saved passwords. This cannot be recovered if forgotten."
          : "Enter your master password to view and edit encrypted passwords."}
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSetup ? "New master password" : "Master password"}
          autoFocus
        />

        {isSetup && (
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm master password"
          />
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || !password}>
          {loading ? "..." : isSetup ? "Set Master Password" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
