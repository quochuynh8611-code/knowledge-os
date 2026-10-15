import { NotebookLMRuntimeStatus } from './types';

export interface ResolveRuntimeStatusOptions {
  /**
   * Whether NotebookLM features are configured and ready in this container
   */
  isConfigured?: boolean;
  /**
   * Whether Audio Overview capability is known to be blocked by schema/contract
   */
  isAudioBlocked?: boolean;
}

/**
 * Pure presentation helper to resolve default runtime status for NotebookLM modals.
 * Truthful rule: Never returns 'verified' unless backed by live verification proof.
 */
export function resolveDefaultRuntimeStatus(
  options?: ResolveRuntimeStatusOptions
): NotebookLMRuntimeStatus {
  if (options?.isAudioBlocked) {
    return 'blocked';
  }
  if (options?.isConfigured) {
    return 'configured';
  }
  return 'unknown';
}

/**
 * Standard truthful runtime status for active Knowledge OS parents with NotebookLM configured.
 */
export const NOTEBOOKLM_DEFAULT_RUNTIME_STATUS: NotebookLMRuntimeStatus =
  resolveDefaultRuntimeStatus({ isConfigured: true });
