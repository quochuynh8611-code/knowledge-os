/**
 * Safe local storage utility helpers for resilient browser storage I/O.
 * Wrapped in try/catch to prevent uncaught SecurityError or QuotaExceededError crashes
 * when storage is disabled, sandboxed, or quota-exceeded.
 */

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
