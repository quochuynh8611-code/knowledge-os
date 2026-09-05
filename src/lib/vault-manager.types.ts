export interface ManagedVaultProfile {
  vaultId: string;
  label: string;
  rootPath: string; // Server-only, strictly unexposed
}

export interface VaultSummaryDto {
  vaultId: string;
  label: string;
  isCurrent: boolean;
}

export interface VaultSwitchResult {
  success: boolean;
  activeVaultId: string;
  label: string;
}

export interface VaultManagerStatus {
  configured: boolean;
  activeVaultId: string | null;
  label: string | null;
  accessible: boolean;
}

export interface SwitchVaultOptions {
  beforeCommitHook?: () => Promise<void>;
}

export interface ObsidianVaultManagerOptions {
  profiles: ManagedVaultProfile[];
  defaultVaultId?: string;
}
