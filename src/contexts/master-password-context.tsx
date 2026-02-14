"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  deriveKey,
  generateSalt,
  encodeSalt,
  decodeSalt,
  encrypt,
  decrypt,
} from "@/lib/crypto";
import { isDemoMode } from "@/lib/demo";

const VERIFY_PLAINTEXT = "heyjimbo-verify";
const DEMO_SALT_KEY = "heyjimbo-demo-encryption-salt";
const DEMO_VERIFY_KEY = "heyjimbo-demo-encryption-verify";

interface MasterPasswordContextValue {
  cryptoKey: CryptoKey | null;
  isUnlocked: boolean;
  hasMasterPassword: boolean | null; // null = loading
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setupMasterPassword: (password: string) => Promise<boolean>;
}

const MasterPasswordContext = createContext<MasterPasswordContextValue>({
  cryptoKey: null,
  isUnlocked: false,
  hasMasterPassword: null,
  unlock: async () => false,
  lock: () => {},
  setupMasterPassword: async () => false,
});

export function useMasterPassword() {
  return useContext(MasterPasswordContext);
}

export function MasterPasswordProvider({ children }: { children: ReactNode }) {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [hasMasterPassword, setHasMasterPassword] = useState<boolean | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Lazy-load encryption settings on first access
  const ensureLoaded = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);

    if (isDemoMode()) {
      const savedSalt = localStorage.getItem(DEMO_SALT_KEY);
      const savedVerify = localStorage.getItem(DEMO_VERIFY_KEY);
      if (savedSalt && savedVerify) {
        setSalt(savedSalt);
        setVerifyToken(savedVerify);
        setHasMasterPassword(true);
      } else {
        setHasMasterPassword(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/encryption");
      const data = await response.json();
      if (data.hasMasterPassword) {
        setSalt(data.salt);
        setVerifyToken(data.verifyToken);
        setHasMasterPassword(true);
      } else {
        setHasMasterPassword(false);
      }
    } catch {
      setHasMasterPassword(false);
    }
  }, [loaded]);

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      await ensureLoaded();

      if (!salt || !verifyToken) return false;

      try {
        const key = await deriveKey(password, decodeSalt(salt));
        // Verify by attempting to decrypt the verify token
        const decrypted = await decrypt(verifyToken, key);
        if (decrypted !== VERIFY_PLAINTEXT) return false;

        setCryptoKey(key);
        return true;
      } catch {
        return false;
      }
    },
    [salt, verifyToken, ensureLoaded]
  );

  const lock = useCallback(() => {
    setCryptoKey(null);
  }, []);

  const setupMasterPassword = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        const newSalt = generateSalt();
        const newSaltBase64 = encodeSalt(newSalt);
        const key = await deriveKey(password, newSalt);
        const newVerifyToken = await encrypt(VERIFY_PLAINTEXT, key);

        if (isDemoMode()) {
          localStorage.setItem(DEMO_SALT_KEY, newSaltBase64);
          localStorage.setItem(DEMO_VERIFY_KEY, newVerifyToken);
        } else {
          const response = await fetch("/api/encryption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              salt: newSaltBase64,
              verifyToken: newVerifyToken,
            }),
          });

          if (!response.ok) return false;
        }

        setSalt(newSaltBase64);
        setVerifyToken(newVerifyToken);
        setHasMasterPassword(true);
        setCryptoKey(key);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return (
    <MasterPasswordContext.Provider
      value={{
        cryptoKey,
        isUnlocked: !!cryptoKey,
        hasMasterPassword,
        unlock,
        lock,
        setupMasterPassword,
      }}
    >
      {children}
    </MasterPasswordContext.Provider>
  );
}
