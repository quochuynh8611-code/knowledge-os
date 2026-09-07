import React, { useState, useEffect } from "react";
import { useData } from "../../context/DataContext";
import {
  parseFlashcardDelimitedText,
  type FlashcardImportParseResult,
  type ParsedFlashcardRow,
} from "../../lib/csvFlashcardParser";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from "../../services/dataRepository";

export interface FlashcardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
  defaultTopicId?: string;
  dataRepository?: { createFlashcard: (input: unknown) => Promise<any> };
}

const defaultRepository =
  typeof window !== "undefined"
    ? new ApiDataRepository("/api", new LocalStorageDataRepository())
    : new LocalStorageDataRepository();

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
    };
  }
}

export function FlashcardImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTopicId,
  dataRepository: customRepo,
}: FlashcardImportModalProps) {
  const dataContext = useSafeData();
  const topics = dataContext.topics || [];
  const repository =
    customRepo ||
    (dataContext as any).dataRepository ||
    defaultRepository;



  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [parseResult, setParseResult] = useState<FlashcardImportParseResult | null>(null);

  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [importFailures, setImportFailures] = useState<string[]>([]);

  // Initialize or reset modal state
  useEffect(() => {
    if (isOpen) {
      setSelectedTopicId(defaultTopicId || "");
      setRawText("");
      setParseResult(null);
      setImporting(false);
      setImportSuccessCount(null);
      setImportFailures([]);
    }
  }, [isOpen, defaultTopicId]);

  if (!isOpen) return null;

  // Trigger parse and update preview
  const handleParse = (textToParse = rawText, topicId = selectedTopicId) => {
    const res = parseFlashcardDelimitedText(textToParse, {
      defaultTopicId: topicId || undefined,
    });
    setParseResult(res);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setRawText(content);
        handleParse(content, selectedTopicId);
      }
    };
    reader.readAsText(file);
  };

  // Execute import of valid rows
  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setImporting(true);
    let success = 0;
    const failures: string[] = [];

    for (const row of parseResult.validRows) {
      if (!row.card) continue;
      try {
        await repository.createFlashcard({
          topicId: row.card.topicId,

          type: row.card.type,
          front: row.card.front,
          back: row.card.back,
          lifecycleStatus: "active",
        });
        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi lưu thẻ";
        failures.push(`Dòng ${row.lineNumber}: ${msg}`);
      }
    }

    setImportSuccessCount(success);
    setImportFailures(failures);
    setImporting(false);
    onSuccess?.(success);
  };

  const validCount = parseResult ? parseResult.validRows.length : 0;
  const invalidCount = parseResult ? parseResult.invalidRows.length : 0;
  const canSubmit = validCount > 0 && !importing && importSuccessCount === null;

  return (
    <div
      data-testid="flashcard-import-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Nhập Flashcard Hàng Loạt (CSV / TSV)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Hỗ trợ định dạng phân tách bằng dấu phẩy (CSV) hoặc dấu Tab (TSV)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Default Topic Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Chủ đề đích mặc định (Default Topic)
            </label>
            <select
              data-testid="select-default-topic"
              value={selectedTopicId}
              onChange={(e) => {
                const newTopic = e.target.value;
                setSelectedTopicId(newTopic);
                if (rawText.trim()) {
                  handleParse(rawText, newTopic);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Chọn chủ đề áp dụng cho các thẻ không có topicId --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-stone-400 mt-1">
              Quy tắc Topic: Nếu một dòng không có topicId trong file, hệ thống sẽ sử dụng chủ đề này.
            </p>
          </div>

          {/* Import Method: File Upload or Raw Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Nội dung CSV / TSV
              </label>
              <label className="text-xs text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1 font-medium">
                <Upload className="w-3.5 h-3.5" />
                <span>Tải tệp (.csv, .tsv)</span>
                <input
                  type="file"
                  data-testid="file-upload-input"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <textarea
              data-testid="raw-text-input"
              rows={4}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
              }}
              placeholder={`Dán nội dung CSV hoặc TSV tại đây. Ví dụ:
front,back,type,topicId
"Thủ đô Việt Nam là gì?","Hà Nội","basic","TOPIC_UUID"
"{{c1::Hà Nội}} là thủ đô của Việt Nam.","Hà Nội","cloze",""`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="btn-parse-preview"
                onClick={() => handleParse()}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kiểm tra & Xem trước (Preview)</span>
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {parseResult && (
            <div data-testid="import-preview" className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              {/* Counts Badge */}
              <div className="flex items-center gap-4">
                <span
                  data-testid="preview-valid-count"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hợp lệ: {validCount} thẻ</span>
                </span>
                <span
                  data-testid="preview-invalid-count"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Lỗi bị loại: {invalidCount} dòng</span>
                </span>
              </div>

              {/* Invalid Rows Detail (if any) */}
              {parseResult.invalidRows.length > 0 && (
                <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-1.5 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Chi tiết các dòng bị loại trừ:
                  </p>
                  {parseResult.invalidRows.map((inv, idx) => (
                    <div key={idx} className="text-[11px] text-rose-700 dark:text-rose-400 flex items-start gap-1">
                      <span className="font-mono font-bold shrink-0">Dòng {inv.lineNumber}:</span>
                      <span>{inv.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {parseResult.validRows.length > 0 && (
                <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Mặt trước</th>
                        <th className="px-3 py-2 font-semibold">Mặt sau</th>
                        <th className="px-3 py-2 font-semibold">Loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                      {parseResult.validRows.slice(0, 30).map((vr, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                          <td className="px-3 py-2 font-medium max-w-xs truncate">{vr.card?.front}</td>
                          <td className="px-3 py-2 text-stone-500 max-w-xs truncate">{vr.card?.back}</td>
                          <td className="px-3 py-2 capitalize font-mono text-[11px]">{vr.card?.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Report Summary */}
          {importSuccessCount !== null && (
            <div
              data-testid="import-report-summary"
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-in fade-in"
            >
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Báo cáo kết quả nhập</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Đã nhập thành công{" "}
                <strong data-testid="report-success-count">{importSuccessCount}</strong> flashcard vào hệ thống.
              </p>
              {importFailures.length > 0 && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 space-y-1">
                  <p className="font-bold">Có {importFailures.length} thẻ gặp lỗi khi lưu:</p>
                  {importFailures.map((f, i) => (
                    <div key={i}>{f}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm font-semibold transition"
          >
            {importSuccessCount !== null ? "Đóng" : "Hủy"}
          </button>
          {importSuccessCount === null && (
            <button
              type="button"
              data-testid="btn-submit-import"
              disabled={!canSubmit}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <span>Đang nhập...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Bắt đầu nhập ({validCount} thẻ)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
