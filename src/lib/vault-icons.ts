/**
 * Vault Icons Mapper (P4.3D)
 *
 * Deterministically maps a vaultId (or label) to a suitable emoji icon
 * based on keyword patterns, falling back to 📁 for generic or unclassified vaults.
 */

const KEYWORD_MAP: Record<string, string[]> = {
  "🔬": ["research", "study", "learn"],
  "📓": ["journal", "daily", "diary"],
  "🪷": ["phat-hoc", "buddhism", "zen"],
  "☯️": ["huyen-hoc", "occult", "fengshui", "phong-thuy"],
  "🌿": ["dong-y", "herb", "medicine", "y-hoc"],
  "💼": ["business", "work", "sop"],
  "💻": ["tech", "code", "dev"],
};

export const DEFAULT_VAULT_ICON = "📁";

export function getVaultIcon(vaultId: string, label: string = ""): string {
  if (!vaultId && !label) {
    return DEFAULT_VAULT_ICON;
  }

  const searchStr = `${vaultId} ${label}`.toLowerCase();

  for (const [icon, words] of Object.entries(KEYWORD_MAP)) {
    if (words.some((w) => searchStr.includes(w))) {
      return icon;
    }
  }

  return DEFAULT_VAULT_ICON;
}
