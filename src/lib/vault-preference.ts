/**
 * Vault Preference Management (P4.3D)
 *
 * Persists and manages recently accessed Obsidian vaults in localStorage.
 * Follows defensive programming to ensure resilience in SSR / incognito / restricted environments.
 */

export const RECENT_VAULTS_KEY = "obsidian_recent_vaults";
const MAX_RECENT_VAULTS = 3;

/**
 * Retrieves the list of recently accessed vaultIds from localStorage.
 * Returns at most 3 items, or an empty array if none found or on storage errors.
 */
export function getRecentVaults(): string[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }

    const raw = localStorage.getItem(RECENT_VAULTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter to valid non-empty string vaultIds
    const validVaultIds = parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );

    return validVaultIds.slice(0, MAX_RECENT_VAULTS);
  } catch (err) {
    console.warn("Failed to retrieve recent vaults from localStorage:", err);
    return [];
  }
}

/**
 * Saves a vaultId as the most recently accessed vault.
 * Deduplicates and caps the history to the most recent 3 vaults.
 */
export function saveRecentVault(vaultId: string): void {
  if (!vaultId || typeof vaultId !== "string" || !vaultId.trim()) {
    return;
  }

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const currentRecent = getRecentVaults();
    // Prepend and deduplicate
    const updated = [vaultId, ...currentRecent.filter((id) => id !== vaultId)].slice(
      0,
      MAX_RECENT_VAULTS
    );

    localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save recent vault to localStorage:", err);
  }
}

/**
 * Clears the stored recent vaults.
 */
export function clearRecentVaults(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(RECENT_VAULTS_KEY);
    }
  } catch (err) {
    console.warn("Failed to clear recent vaults from localStorage:", err);
  }
}
