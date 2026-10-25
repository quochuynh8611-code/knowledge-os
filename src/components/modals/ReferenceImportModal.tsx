import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Resource, ResourceType } from '../../types';
import {
  parseUniversalReferences,
  deduplicateImportedResources,
  DeduplicationResult,
} from '../../lib/referenceParser';
import { embedAcademicMetadataInNotes } from '../../lib/citationGenerator';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Library,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export interface ReferenceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopicId?: string;
}

export function ReferenceImportModal({
  isOpen,
  onClose,
  defaultTopicId,
}: ReferenceImportModalProps) {
  const { topics, resources, addResource } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topicId, setTopicId] = useState<string>(
    defaultTopicId || topics[0]?.id || ''
  );
  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<DeduplicationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content || '');
    };
    reader.onerror = () => {
      setErrorMsg('Không thể đọc tệp đã chọn. Vui lòng thử lại.');
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    setErrorMsg(null);
    const content = inputText.trim();

    if (!content) {
      setErrorMsg('Vui lòng dán nội dung BibTeX/RIS/CSL-JSON hoặc chọn tệp tải lên.');
      return;
    }

    try {
      const candidates = parseUniversalReferences(content, fileName);
      if (!candidates || candidates.length === 0) {
        setErrorMsg('Không nhận diện được tài liệu nào từ dữ liệu nhập. Vui lòng kiểm tra định dạng BibTeX, RIS hoặc Zotero CSL-JSON.');
        setParseResult(null);
        return;
      }

      const dedup = deduplicateImportedResources(candidates, resources);
      setParseResult(dedup);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi phân tích dữ liệu tham khảo.');
      setParseResult(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.unique.length === 0) return;

    if (!topicId) {
      setErrorMsg('Vui lòng chọn chủ đề nghiên cứu đích để lưu tài liệu.');
      return;
    }

    const currentTopic = topics.find((t) => t.id === topicId);
    setIsImporting(true);

    try {
      for (const item of parseResult.unique) {
        const title = (item.title || 'Tài liệu tham khảo mới').trim();
        const rawNotes = item.notes || '';
        const packedNotes = embedAcademicMetadataInNotes(rawNotes, {
          doi: item.doi,
          year: item.year,
          journal: item.journal,
          publisher: item.publisher,
          volume: item.volume,
          issue: item.issue,
          pages: item.pages,
          isbn: item.isbn,
        });

        addResource({
          topicId,
          topicTitle: currentTopic?.title || 'Chủ đề chung',
          title,
          type: (item.type || 'article') as ResourceType,
          author: item.author?.trim(),
          url: item.url?.trim(),
          filePath: item.filePath?.trim(),
          notes: packedNotes || undefined,
          doi: item.doi?.trim(),
          year: item.year?.trim(),
          journal: item.journal?.trim(),
          publisher: item.publisher?.trim(),
          volume: item.volume?.trim(),
          issue: item.issue?.trim(),
          pages: item.pages?.trim(),
          isbn: item.isbn?.trim(),
        });
      }

      setIsImporting(false);
      onClose();
    } catch (err: any) {
      setIsImporting(false);
      setErrorMsg(err?.message || 'Lỗi trong quá trình nhập tài liệu.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nhập tài liệu học thuật hàng loạt"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800">
              <Library className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title">
                Nhập Tài Liệu Hàng Loạt
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Hỗ trợ tệp BibTeX (.bib), RIS (.ris), và Zotero CSL-JSON (.json)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Target Topic Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Lưu vào chủ đề nghiên cứu:
            </label>
            <select
              data-testid="select-import-topic"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Upload or Paste */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Dán nội dung hoặc chọn tệp (.bib, .ris, .json):
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{fileName ? `Đã chọn: ${fileName}` : 'Tải tệp từ máy tính'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".bib,.ris,.json,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <textarea
              data-testid="textarea-reference-import"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setParseResult(null);
                setErrorMsg(null);
              }}
              rows={6}
              placeholder="Dán nội dung BibTeX (@article{...}), thẻ RIS (TY  - JOUR...) hoặc mảng Zotero CSL-JSON vào đây..."
              className="w-full p-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Parse Button */}
          <div className="flex justify-end">
            <button
              type="button"
              data-testid="btn-parse-references"
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Phân tích dữ liệu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parse Results Preview */}
          {parseResult && (
            <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sẵn sàng nhập: {parseResult.unique.length} tài liệu hợp lệ</span>
                </span>
                {parseResult.duplicates.length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Trùng lặp: {parseResult.duplicates.length} mục (sẽ bỏ qua)</span>
                  </span>
                )}
              </div>

              {/* Unique items preview list */}
              {parseResult.unique.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {parseResult.unique.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 text-xs space-y-0.5"
                    >
                      <div className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap gap-2">
                        {item.author && <span>Tác giả: {item.author}</span>}
                        {item.year && <span>({item.year})</span>}
                        {item.journal && <span>• {item.journal}</span>}
                        {item.doi && <span className="font-mono text-amber-800 dark:text-amber-400">DOI: {item.doi}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Duplicates preview */}
              {parseResult.duplicates.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                  <div className="font-semibold">Chi tiết các mục trùng lặp được phát hiện:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {parseResult.duplicates.map((dup, dIdx) => (
                      <li key={dIdx}>
                        <span className="font-medium">{dup.candidate.title}</span> — <span className="text-stone-500 dark:text-stone-400">({dup.reason})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            data-testid="btn-confirm-reference-import"
            disabled={!parseResult || parseResult.unique.length === 0 || isImporting}
            onClick={handleConfirmImport}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isImporting
                ? 'Đang nhập...'
                : `Nhập ${parseResult?.unique.length || 0} tài liệu`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
