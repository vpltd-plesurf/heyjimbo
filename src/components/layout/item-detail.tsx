"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, Trash2, RotateCcw, X, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { BookmarkEditor } from "@/components/items/bookmark-editor";
import { PasswordEditor } from "@/components/items/password-editor";
import { SerialNumberEditor } from "@/components/items/serial-number-editor";
import { LabelPicker } from "@/components/labels/label-picker";
import { MasterPasswordDialog } from "@/components/encryption/master-password-dialog";
import { useMasterPassword } from "@/contexts/master-password-context";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { isDemoMode } from "@/lib/demo";
import { cn } from "@/lib/utils/cn";
import type { Item, Label } from "@/types/item";

const isDemo = isDemoMode();

interface ItemDetailProps {
  item: Item | null;
  onUpdate: (id: string, updates: Partial<Item & { content?: string }>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  allLabels?: Label[];
  onAssignLabel?: (itemId: string, labelId: string) => void;
  onRemoveLabel?: (itemId: string, labelId: string) => void;
}

export function ItemDetail({
  item,
  onUpdate,
  onDelete,
  onClose,
  allLabels = [],
  onAssignLabel,
  onRemoveLabel,
}: ItemDetailProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Bookmark fields
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const [bookmarkSourceUrl, setBookmarkSourceUrl] = useState("");

  // Password fields
  const [pwLocation, setPwLocation] = useState("");
  const [pwAccount, setPwAccount] = useState("");
  const [pwPassword, setPwPassword] = useState("");

  // Serial number fields
  const [snSerialNumber, setSnSerialNumber] = useState("");
  const [snOwnerName, setSnOwnerName] = useState("");
  const [snOwnerEmail, setSnOwnerEmail] = useState("");
  const [snOrganization, setSnOrganization] = useState("");

  // Track the item ID to detect item switches vs content updates
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Encryption state
  const { cryptoKey, isUnlocked, lock } = useMasterPassword();
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
  const [rawEncryptedPassword, setRawEncryptedPassword] = useState("");

  // Check if this password item has an encrypted password value
  const passwordIsEncrypted = item?.type === "password" && isEncrypted(rawEncryptedPassword);
  const passwordNeedsUnlock = item?.type === "password" && passwordIsEncrypted && !isUnlocked;

  // Reset state when item changes
  useEffect(() => {
    if (item && item.id !== activeItemId) {
      setName(item.name);
      setContent(item.note_content?.content || "");
      setBookmarkUrl(item.bookmark_content?.url || "");
      setBookmarkSourceUrl(item.bookmark_content?.source_url || "");
      setPwLocation(item.password_content?.location || "");
      setPwAccount(item.password_content?.account || "");

      // Store the raw password value for encryption detection
      const rawPw = item.password_content?.password || "";
      setRawEncryptedPassword(rawPw);

      // Decrypt password if possible, otherwise show raw/empty
      if (isEncrypted(rawPw) && cryptoKey) {
        decrypt(rawPw, cryptoKey)
          .then((decrypted) => setPwPassword(decrypted))
          .catch(() => setPwPassword(""));
      } else if (isEncrypted(rawPw)) {
        setPwPassword(""); // Encrypted but locked — don't show anything
      } else {
        setPwPassword(rawPw); // Plaintext (legacy or new)
      }

      setSnSerialNumber(item.serial_number_content?.serial_number || "");
      setSnOwnerName(item.serial_number_content?.owner_name || "");
      setSnOwnerEmail(item.serial_number_content?.owner_email || "");
      setSnOrganization(item.serial_number_content?.organization || "");
      setIsDirty(false);
      setActiveItemId(item.id);
    }
  }, [item, activeItemId, cryptoKey]);

  // When unlocked mid-session, decrypt the current password
  useEffect(() => {
    if (cryptoKey && isEncrypted(rawEncryptedPassword) && item?.type === "password") {
      decrypt(rawEncryptedPassword, cryptoKey)
        .then((decrypted) => setPwPassword(decrypted))
        .catch(() => setPwPassword(""));
    }
  }, [cryptoKey, rawEncryptedPassword, item?.type]);

  // Build update payload based on item type
  const buildUpdatePayload = useCallback(async () => {
    if (!item) return {};
    const payload: Record<string, unknown> = { name };

    if (item.type === "note") {
      payload.content = content;
    } else if (item.type === "bookmark") {
      payload.bookmark_url = bookmarkUrl;
      payload.bookmark_source_url = bookmarkSourceUrl;
    } else if (item.type === "password") {
      payload.pw_location = pwLocation;
      payload.pw_account = pwAccount;
      // Encrypt password if we have a crypto key
      if (cryptoKey && pwPassword) {
        payload.pw_password = await encrypt(pwPassword, cryptoKey);
      } else {
        payload.pw_password = pwPassword;
      }
    } else if (item.type === "serial_number") {
      payload.sn_serial_number = snSerialNumber;
      payload.sn_owner_name = snOwnerName;
      payload.sn_owner_email = snOwnerEmail;
      payload.sn_organization = snOrganization;
    }

    return payload;
  }, [item, name, content, bookmarkUrl, bookmarkSourceUrl, pwLocation, pwAccount, pwPassword, cryptoKey, snSerialNumber, snOwnerName, snOwnerEmail, snOrganization]);

  // Auto-save debounce
  const saveChanges = useCallback(async () => {
    if (item && isDirty) {
      const payload = await buildUpdatePayload();
      onUpdate(item.id, payload);
      // Update raw encrypted password to match what we just saved
      if (payload.pw_password && typeof payload.pw_password === "string") {
        setRawEncryptedPassword(payload.pw_password);
      }
      setIsDirty(false);
    }
  }, [item, isDirty, buildUpdatePayload, onUpdate]);

  // Auto-save after 1 second of no changes
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(saveChanges, 1000);
    return () => clearTimeout(timer);
  }, [isDirty, saveChanges]);

  // Save on blur
  const handleBlur = () => {
    if (isDirty) {
      saveChanges();
    }
  };

  const markDirty = () => setIsDirty(true);

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">
          Select an item to view details
        </p>
      </div>
    );
  }

  const handleToggleFlag = () => {
    onUpdate(item.id, { is_flagged: !item.is_flagged });
  };

  const handleMoveToTrash = () => {
    onUpdate(item.id, { is_trashed: true });
  };

  const handleRestore = () => {
    onUpdate(item.id, { is_trashed: false });
  };

  const handlePermanentDelete = () => {
    if (confirm("Are you sure you want to permanently delete this item?")) {
      onDelete(item.id);
    }
  };

  // Show master password dialog inline for password items
  if (showMasterPasswordDialog) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        <div className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-700">
          <Button variant="ghost" size="icon" onClick={() => setShowMasterPasswordDialog(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <MasterPasswordDialog
            onUnlocked={() => setShowMasterPasswordDialog(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFlag}
            className={cn(item.is_flagged && "text-orange-500")}
          >
            <Flag className="w-4 h-4" />
          </Button>
          {item.is_trashed ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleRestore}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePermanentDelete}
                className="text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleMoveToTrash}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {onAssignLabel && onRemoveLabel && (
            <LabelPicker
              allLabels={allLabels}
              assignedLabels={item.labels || []}
              onAssign={(labelId) => onAssignLabel(item.id, labelId)}
              onRemove={(labelId) => onRemoveLabel(item.id, labelId)}
            />
          )}
          {/* Lock/Unlock button for password items */}
          {item.type === "password" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isUnlocked) {
                  lock();
                } else {
                  setShowMasterPasswordDialog(true);
                }
              }}
              className={cn(isUnlocked ? "text-green-500" : "text-gray-400")}
              title={isUnlocked ? "Lock passwords" : "Unlock passwords"}
            >
              {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 capitalize">{item.type.replace("_", " ")}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Title */}
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          onBlur={handleBlur}
          placeholder="Untitled"
          className="text-xl font-semibold border-0 p-0 h-auto focus:ring-0 bg-transparent"
          disabled={item.is_trashed}
        />

        {/* Type-specific editor */}
        <div className="flex-1 mt-4 overflow-hidden" onBlur={handleBlur}>
          {item.type === "note" && (
            <TipTapEditor
              content={content}
              onChange={(html) => {
                setContent(html);
                markDirty();
              }}
              editable={!item.is_trashed}
            />
          )}

          {item.type === "bookmark" && (
            <BookmarkEditor
              url={bookmarkUrl}
              sourceUrl={bookmarkSourceUrl}
              onUrlChange={(v) => { setBookmarkUrl(v); markDirty(); }}
              onSourceUrlChange={(v) => { setBookmarkSourceUrl(v); markDirty(); }}
              disabled={item.is_trashed}
            />
          )}

          {item.type === "password" && (
            <PasswordEditor
              location={pwLocation}
              account={pwAccount}
              password={pwPassword}
              onLocationChange={(v) => { setPwLocation(v); markDirty(); }}
              onAccountChange={(v) => { setPwAccount(v); markDirty(); }}
              onPasswordChange={(v) => { setPwPassword(v); markDirty(); }}
              disabled={item.is_trashed}
              isEncryptionLocked={passwordNeedsUnlock}
              onRequestUnlock={() => setShowMasterPasswordDialog(true)}
            />
          )}

          {item.type === "serial_number" && (
            <SerialNumberEditor
              serialNumber={snSerialNumber}
              ownerName={snOwnerName}
              ownerEmail={snOwnerEmail}
              organization={snOrganization}
              onSerialNumberChange={(v) => { setSnSerialNumber(v); markDirty(); }}
              onOwnerNameChange={(v) => { setSnOwnerName(v); markDirty(); }}
              onOwnerEmailChange={(v) => { setSnOwnerEmail(v); markDirty(); }}
              onOrganizationChange={(v) => { setSnOrganization(v); markDirty(); }}
              disabled={item.is_trashed}
            />
          )}
        </div>

        {/* Status indicator */}
        {isDirty && (
          <p className="text-xs text-gray-400 mt-2">Saving...</p>
        )}
      </div>

      {/* Attachments (production only, non-folder items) */}
      {!isDemo && item.type !== "folder" && (
        <AttachmentList itemId={item.id} />
      )}
    </div>
  );
}
