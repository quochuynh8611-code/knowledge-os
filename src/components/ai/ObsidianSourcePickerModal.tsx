import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, X, Check, FileText, AlertCircle, HardDrive, Tag, RefreshCw, Loader2 } from 'lucide-react';

export interface VaultSummaryOption {
  vaultId: string;
  label: string;
  isCurrent?: boolean;
}

export interface ObsidianDocumentCandidate {
  relativePath: string;
  fileName: string;
  title: string;
  tags?: string[];
  sizeBytes?: number;
}

export interface ObsidianSourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaults?: VaultSummaryOption[];
  initialVaultId?: string;
  initialSelectedPaths?: string[];
  availableDocs?: ObsidianDocumentCandidate[];
  onConfirm: (result: { vaultProfileId: string; selectedRelativePaths: string[] }) => void;
}

interface VaultsApiResponse {
  activeVaultId: string | null;
  vaults: VaultSummaryOption[];
  error?: string;
  message?: string;
}

interface SearchDocResult {
  path?: string;
  relativePath?: string;
  fileName?: string;
  title?: string;
  tags?: string[];
  sizeBytes?: number;
}

interface SearchApiResponse {
  results?: SearchDocResult[];
  error?: string;
  message?: string;
}

const DEFAULT_VAULTS: VaultSummaryOption[] = [];
const DEFAULT_PATHS: string[] = [];
const DEFAULT_DOCS: ObsidianDocumentCandidate[] = [];

function hasStringProperty(
  value: unknown,
  property: string
): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    property in value &&
    typeof (value as Record<string, unknown>)[property] === 'string'
  );
}

function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  if (hasStringProperty(error, 'name')) {
    return error.name === 'AbortError';
  }
  return false;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (hasStringProperty(error, 'message') && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
}

export const ObsidianSourcePickerModal: React.FC<ObsidianSourcePickerModalProps> = ({
  isOpen,
  onClose,
  vaults: propVaults = DEFAULT_VAULTS,
  initialVaultId,
  initialSelectedPaths = DEFAULT_PATHS,
  availableDocs = DEFAULT_DOCS,
  onConfirm,
}) => {
  const [vaultList, setVaultList] = useState<VaultSummaryOption[]>(propVaults);
  const [isLoadingVaults, setIsLoadingVaults] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const [selectedVaultId, setSelectedVaultId] = useState<string>(() => {
    return initialVaultId || propVaults[0]?.vaultId || '';
  });

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [docs, setDocs] = useState<ObsidianDocumentCandidate[]>(availableDocs);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Invariant & Concurrency Guards
  const requestSequenceRef = useRef<number>(0);
  const selectedVaultIdRef = useRef<string>(selectedVaultId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    selectedVaultIdRef.current = selectedVaultId;
  }, [selectedVaultId]);

  const invalidatePendingRequest = useCallback(() => {
    requestSequenceRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Sync prop vaults when propVaults changes
  useEffect(() => {
    if (propVaults && propVaults.length > 0) {
      setVaultList(propVaults);
    }
  }, [propVaults]);

  // Fetch vaults list from API if not provided or empty
  const fetchVaultList = useCallback(async () => {
    setIsLoadingVaults(true);
    setVaultError(null);
    try {
      const res = await fetch('/api/obsidian/vaults');
      const data: VaultsApiResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải danh sách Vault.');
      }

      const list = Array.isArray(data.vaults) ? data.vaults : [];
      if (!isMountedRef.current) return;
      setVaultList(list);

      // Automatically select active vault
      const activeId =
        data.activeVaultId ||
        list.find((v) => v.isCurrent)?.vaultId ||
        list[0]?.vaultId ||
        '';

      if (activeId) {
        setSelectedVaultId((curr) => curr || activeId);
      }
    } catch (err: unknown) {
      if (isAbortError(err) || !isMountedRef.current) return;
      setVaultError(getErrorMessage(err, 'Không thể tải danh sách Vault.'));
    } finally {
      if (isMountedRef.current) {
        setIsLoadingVaults(false);
      }
    }
  }, []);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPaths(initialSelectedPaths.slice(0, 3));
      setSearchQuery('');
      setDocsError(null);

      if (propVaults.length > 0) {
        setVaultList(propVaults);
        const defaultId =
          initialVaultId ||
          propVaults.find((v) => v.isCurrent)?.vaultId ||
          propVaults[0]?.vaultId ||
          '';
        setSelectedVaultId(defaultId);
      } else {
        fetchVaultList();
      }
    } else {
      invalidatePendingRequest();
      setIsLoadingDocs(false);
    }
  }, [isOpen, initialVaultId, initialSelectedPaths, propVaults, fetchVaultList, invalidatePendingRequest]);

  // Search/fetch docs from API scoped to selectedVaultId
  const fetchScopedDocs = useCallback(async () => {
    if (!isOpen || availableDocs.length > 0 || !selectedVaultId) {
      if (availableDocs.length > 0) setDocs(availableDocs);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++requestSequenceRef.current;
    const targetVaultId = selectedVaultId;

    setIsLoadingDocs(true);
    setDocsError(null);

    try {
      const queryParam = searchQuery.trim()
        ? `&q=${encodeURIComponent(searchQuery.trim())}`
        : '&all=true';
      const url = `/api/obsidian/vault/search?vaultId=${encodeURIComponent(targetVaultId)}${queryParam}`;

      const res = await fetch(url, { signal: controller.signal });
      const data: SearchApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi tìm kiếm tài liệu.');
      }

      if (
        !isMountedRef.current ||
        controller.signal.aborted ||
        currentSeq !== requestSequenceRef.current ||
        selectedVaultIdRef.current !== targetVaultId
      ) {
        return;
      }

      const candidates: ObsidianDocumentCandidate[] = (data.results || []).map((r) => ({
        relativePath: r.path || r.relativePath || '',
        fileName: r.fileName || r.title || (r.path ? r.path.split('/').pop() || '' : ''),
        title: r.title || r.fileName || r.path || '',
        tags: Array.isArray(r.tags) ? r.tags : [],
        sizeBytes: typeof r.sizeBytes === 'number' ? r.sizeBytes : 0,
      }));

      setDocs(candidates);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      if (
        !isMountedRef.current ||
        controller.signal.aborted ||
        currentSeq !== requestSequenceRef.current ||
        selectedVaultIdRef.current !== targetVaultId
      ) {
        return;
      }
      setDocs([]);
      setDocsError(getErrorMessage(err, 'Không thể nạp danh sách tài liệu.'));
    } finally {
      if (
        isMountedRef.current &&
        !controller.signal.aborted &&
        currentSeq === requestSequenceRef.current &&
        selectedVaultIdRef.current === targetVaultId
      ) {
        setIsLoadingDocs(false);
      }
    }
  }, [isOpen, availableDocs, selectedVaultId, searchQuery]);

  useEffect(() => {
    fetchScopedDocs();
  }, [fetchScopedDocs]);

  // Filter documents in memory if search query present
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase().trim();
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.relativePath.toLowerCase().includes(q) ||
        (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [docs, searchQuery]);

  // Track missing files (paths in initial selection that are not in available docs)
  const availablePathSet = useMemo(() => new Set(docs.map((d) => d.relativePath)), [docs]);
  const missingPaths = useMemo(
    () => selectedPaths.filter((p) => docs.length > 0 && !availablePathSet.has(p)),
    [selectedPaths, docs, availablePathSet]
  );

  const handleTogglePath = (path: string) => {
    setSelectedPaths((prev) => {
      if (prev.includes(path)) {
        return prev.filter((p) => p !== path);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 items
      }
      return [...prev, path];
    });
  };

  const handleConfirm = () => {
    // Only return non-missing valid paths
    const validPaths = selectedPaths.filter((p) => docs.length === 0 || availablePathSet.has(p));
    onConfirm({
      vaultProfileId: selectedVaultId,
      selectedRelativePaths: validPaths.slice(0, 3),
    });
    onClose();
  };

  if (!isOpen) return null;

  const isMaxReached = selectedPaths.length >= 3;
  const hasNoVaults = !isLoadingVaults && !vaultError && vaultList.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="obsidian-picker-title"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 id="obsidian-picker-title" className="text-lg font-semibold text-slate-100">
                Chọn Tài Liệu Obsidian (Khảo Cứu AI)
              </h2>
              <p className="text-xs text-slate-400">
                Tối đa 3 tài liệu toàn văn Markdown cho một yêu cầu khảo cứu (tối đa 8.000 ký tự/tài liệu).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Vault Select & Search */}
        <div className="p-6 pb-3 space-y-4 border-b border-slate-800/80 bg-slate-900/30">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Vault Profile Selector */}
            <div className="w-full sm:w-1/3">
              <label htmlFor="picker-vault-select" className="block text-xs font-medium text-slate-400 mb-1.5">
                Vault Profile
              </label>
              <select
                id="picker-vault-select"
                value={selectedVaultId}
                disabled={isLoadingVaults || vaultList.length === 0}
                onChange={(e) => {
                  const nextVaultId = e.target.value;
                  invalidatePendingRequest();
                  setDocs([]);
                  setSelectedPaths([]);
                  setSearchQuery('');
                  setDocsError(null);
                  setSelectedVaultId(nextVaultId);
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {vaultList.map((v) => (
                  <option key={v.vaultId} value={v.vaultId}>
                    {v.label} {v.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Search Input */}
            <div className="w-full sm:w-2/3">
              <label htmlFor="picker-doc-search" className="block text-xs font-medium text-slate-400 mb-1.5">
                Tìm kiếm tài liệu
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="picker-doc-search"
                  type="text"
                  value={searchQuery}
                  disabled={hasNoVaults || isLoadingVaults}
                  onChange={(e) => {
                    const nextQuery = e.target.value;
                    invalidatePendingRequest();
                    setSearchQuery(nextQuery);
                  }}
                  placeholder="Tìm kiếm tài liệu Obsidian..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Missing Paths Warning */}
          {missingPaths.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Cảnh báo tài liệu thiếu:</span>
                <ul className="list-disc list-inside mt-1">
                  {missingPaths.map((p) => (
                    <li key={p}>
                      <span className="font-mono">{p}</span> — <span>Không tìm thấy trên đĩa</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Selection Count Badge */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span aria-live="polite" className="font-medium text-purple-400">
              Đã chọn: {selectedPaths.length} / 3 tài liệu
            </span>
            {isMaxReached && (
              <span className="text-amber-400">Đã đạt giới hạn tối đa 3 tài liệu/request</span>
            )}
          </div>
        </div>

        {/* Document List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 divide-y divide-slate-800/50 min-h-[220px]">
          {isLoadingVaults ? (
            <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span>Đang tải danh sách Vault Profiles...</span>
            </div>
          ) : vaultError ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-rose-300 font-medium">{vaultError}</p>
              <button
                type="button"
                onClick={fetchVaultList}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : hasNoVaults ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-3">
              <HardDrive className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-slate-200 font-semibold text-base">Chưa có Obsidian Vault khả dụng</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hệ thống chưa tìm thấy cấu hình Obsidian Vault nào được đăng ký trên máy Mac.
              </p>
              <button
                type="button"
                onClick={fetchVaultList}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : isLoadingDocs ? (
            <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span>Đang nạp danh sách tài liệu...</span>
            </div>
          ) : docsError ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-amber-300 font-medium">{docsError}</p>
              <button
                type="button"
                onClick={fetchScopedDocs}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Không tìm thấy tài liệu phù hợp trong vault này.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedPaths.includes(doc.relativePath);
              const isDisabled = !isSelected && isMaxReached;

              return (
                <label
                  key={doc.relativePath}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500/40 text-slate-100'
                      : isDisabled
                      ? 'opacity-40 bg-slate-900/30 border-transparent cursor-not-allowed text-slate-500'
                      : 'bg-slate-800/40 border-slate-750/50 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => handleTogglePath(doc.relativePath)}
                    className="mt-1 rounded border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={doc.title || doc.fileName}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-sm font-medium truncate text-slate-100">
                        {doc.title || doc.fileName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                      {doc.relativePath}
                    </p>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-300"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {doc.sizeBytes !== undefined && doc.sizeBytes > 0 && (
                    <span className="text-[11px] text-slate-500 shrink-0">
                      ~{Math.round(doc.sizeBytes / 1024)} KB
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={() => setSelectedPaths([])}
            disabled={selectedPaths.length === 0}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
          >
            Bỏ chọn tất cả
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={hasNoVaults || selectedPaths.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Xác Nhận Nguồn ({selectedPaths.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
