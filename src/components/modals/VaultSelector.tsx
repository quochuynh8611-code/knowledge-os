import React, { useState, useEffect, useCallback, useRef } from "react";
import { Folder, Loader2, AlertCircle } from "lucide-react";
import { VaultSummaryDto } from "../../lib/vault-manager.types";
import { getVaultIcon } from "../../lib/vault-icons";
import { getRecentVaults, saveRecentVault } from "../../lib/vault-preference";
import { useVaultKeyboardShortcut } from "../../hooks/useVaultKeyboardShortcut";
import { Toast, ToastType } from "../ui/Toast";

export interface VaultSelectorProps {
  onVaultSwitched?: (newVaultId: string) => void;
  className?: string;
}

interface VaultsApiResponse {
  activeVaultId: string | null;
  vaults: VaultSummaryDto[];
  error?: string;
  message?: string;
}

export function VaultSelector({ onVaultSwitched, className = "" }: VaultSelectorProps) {
  const [vaults, setVaults] = useState<VaultSummaryDto[]>([]);
  const [activeVaultId, setActiveVaultId] = useState<string>("");
  const [recentVaultIds, setRecentVaultIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const selectRef = useRef<HTMLSelectElement>(null);

  // Keyboard shortcut: Alt+V to focus selector, Escape to blur
  useVaultKeyboardShortcut({
    targetRef: selectRef,
    enabled: !isLoading && !isSwitching,
  });

  // Load recent vaults from localStorage
  useEffect(() => {
    setRecentVaultIds(getRecentVaults());
  }, []);

  const fetchVaults = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/obsidian/vaults");
      const data: VaultsApiResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không thể tải danh sách Vaults.");
      }

      setVaults(data.vaults || []);
      if (data.activeVaultId) {
        setActiveVaultId(data.activeVaultId);
      } else if (data.vaults && data.vaults.length > 0) {
        const current = data.vaults.find((v) => v.isCurrent) || data.vaults[0];
        setActiveVaultId(current.vaultId);
      }
    } catch (err: any) {
      const msg = err.message || "Lỗi nạp cấu hình Vault.";
      setErrorMessage(msg);
      setToast({ message: `Failed to load vaults: ${msg}`, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  const handleSelectVault = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetVaultId = e.target.value;
    if (!targetVaultId || targetVaultId === activeVaultId || isSwitching) {
      return;
    }

    const priorVaultId = activeVaultId;
    const targetLabel = vaults.find((v) => v.vaultId === targetVaultId)?.label || targetVaultId;

    setIsSwitching(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/obsidian/vault/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vaultId: targetVaultId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Lỗi khi chuyển đổi Vault.");
      }

      setActiveVaultId(targetVaultId);
      setVaults((prev) =>
        prev.map((v) => ({
          ...v,
          isCurrent: v.vaultId === targetVaultId,
        }))
      );

      // Persist in recent vaults
      saveRecentVault(targetVaultId);
      setRecentVaultIds(getRecentVaults());

      // Show success toast
      setToast({
        message: `Switched to ${targetLabel}`,
        type: "success",
      });

      if (onVaultSwitched) {
        onVaultSwitched(targetVaultId);
      }
    } catch (err: any) {
      const msg = err.message || "Không thể chuyển đổi Vault.";
      setErrorMessage(msg);
      setToast({
        message: `Failed to switch: ${msg}`,
        type: "error",
      });
      // Rollback UI selection to prior
      setActiveVaultId(priorVaultId);
    } finally {
      setIsSwitching(false);
    }
  };

  // Organize vaults into Recent and Other groups if recent items exist
  const recentVaults = recentVaultIds
    .map((id) => vaults.find((v) => v.vaultId === id))
    .filter((v): v is VaultSummaryDto => Boolean(v));

  const otherVaults = vaults.filter((v) => !recentVaultIds.includes(v.vaultId));
  const hasRecentSection = recentVaults.length > 0 && otherVaults.length > 0;

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="relative flex items-center">
        <label htmlFor="obsidian-vault-select" className="sr-only">
          Chọn Obsidian Vault
        </label>

        <div
          title="Chọn Obsidian Vault (Alt + V)"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 hover:border-purple-300 focus-within:border-purple-400 rounded-lg shadow-xs transition text-xs text-stone-700"
        >
          {isSwitching ? (
            <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}

          <select
            id="obsidian-vault-select"
            ref={selectRef}
            aria-label="Chọn Obsidian Vault"
            aria-keyshortcuts="Alt+V"
            aria-busy={isSwitching}
            disabled={isLoading || isSwitching || vaults.length === 0}
            value={activeVaultId}
            onChange={handleSelectVault}
            className="bg-transparent font-medium text-stone-800 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 pr-1 text-xs"
          >
            {hasRecentSection ? (
              <>
                <optgroup label="Gần đây (Recent)">
                  {recentVaults.map((vault) => (
                    <option key={`recent-${vault.vaultId}`} value={vault.vaultId}>
                      {getVaultIcon(vault.vaultId, vault.label)} {vault.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tất cả Vaults">
                  {otherVaults.map((vault) => (
                    <option key={`all-${vault.vaultId}`} value={vault.vaultId}>
                      {getVaultIcon(vault.vaultId, vault.label)} {vault.label}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              vaults.map((vault) => (
                <option key={vault.vaultId} value={vault.vaultId}>
                  {getVaultIcon(vault.vaultId, vault.label)} {vault.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

    </div>
  );
}
