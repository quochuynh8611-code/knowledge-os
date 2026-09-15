/**
 * Safe local storage utility helpers for resilient browser storage I/O.
 * Wrapped in try/catch to prevent uncaught SecurityError or QuotaExceededError crashes
 * when storage is disabled, sandboxed, or quota-exceeded.
 */

export const FOCUS_DOMAIN_STORAGE_KEY = 'knowledge_os_focus_domain_id_v1';
export const STORAGE_ROOT_KEY = 'phat_hoc_huyen_hoc_clean_v3';
export const STORAGE_VERSION_KEY = 'knowledge_os_storage_version';
export const CURRENT_STORAGE_VERSION = 3;

/**
 * Safely retrieves an item from localStorage without throwing if storage is blocked or inaccessible.
 */
export function safeGetLocalStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Graceful fallback when localStorage is blocked or unavailable
  }
  return null;
}

/**
 * Safely sets an item in localStorage without throwing if quota is exceeded or storage is blocked.
 */
export function safeSetLocalStorageItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {
    // Graceful fallback when localStorage quota is exceeded or storage is blocked
  }
  return false;
}

/**
 * Safely removes an item from localStorage without throwing if storage is blocked.
 */
export function safeRemoveLocalStorageItem(key: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch {
    // Graceful fallback when localStorage is blocked
  }
  return false;
}

/**
 * Clears all cached Knowledge OS data state from localStorage.
 * Only targets explicitly audited keys without touching other browser data.
 */
export function clearAllAppStorage(): void {
  const keysToRemove = [
    STORAGE_ROOT_KEY,
    `${STORAGE_ROOT_KEY}_categories`,
    `${STORAGE_ROOT_KEY}_topics`,
    `${STORAGE_ROOT_KEY}_notes`,
    `${STORAGE_ROOT_KEY}_resources`,
    `${STORAGE_ROOT_KEY}_tags`,
    FOCUS_DOMAIN_STORAGE_KEY,
  ];

  for (const k of keysToRemove) {
    safeRemoveLocalStorageItem(k);
  }
}

/**
 * Ensures storage version compatibility upon app startup.
 * If the persisted version is missing or older than CURRENT_STORAGE_VERSION,
 * only the audited app-state keys are safely purged and the version is updated.
 *
 * @returns true if storage was invalidated/updated, false if already up-to-date.
 */
export function ensureStorageVersionCompatibility(): boolean {
  const rawVersion = safeGetLocalStorageItem(STORAGE_VERSION_KEY);
  const parsedVersion = rawVersion ? parseInt(rawVersion, 10) : 0;

  if (isNaN(parsedVersion) || parsedVersion < CURRENT_STORAGE_VERSION) {
    clearAllAppStorage();
    safeSetLocalStorageItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    return true;
  }

  return false;
}
