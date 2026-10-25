import React, { useState, useMemo } from 'react';
import { Resource } from '../../types';
import {
  generateBatchCitations,
  getBatchCitationDownloadFilename,
} from '../../lib/citationGenerator';
import {
  CitationFormat,
  getStoredCitationFormat,
  setStoredCitationFormat,
} from '../../lib/citationPreferences';
import { X, Copy, Check, FileDown, BookOpen, Code, FileText, Library } from 'lucide-react';

interface BatchCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
}

export function BatchCitationModal({ isOpen, onClose, resources }: BatchCitationModalProps) {
  const [format, setFormat] = useState<CitationFormat>(getStoredCitationFormat);
  const [copied, setCopied] = useState(false);

  const batchContent = useMemo(() => {
    return generateBatchCitations(resources, format);
  }, [resources, format]);

  const filename = useMemo(() => {
    return getBatchCitationDownloadFilename(format);
  }, [format]);

  if (!isOpen) return null;

  const handleFormatChange = (newFormat: CitationFormat) => {
    setFormat(newFormat);
    setStoredCitationFormat(newFormat);
    setCopied(false);
  };

  const handleCopyAll = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(batchContent);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    try {
      const mimeType = format === 'bibtex' ? 'application/x-bibtex' : 'text/plain';
      const blob = new Blob([batchContent], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download citation file:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xuất danh mục trích dẫn hàng loạt"
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
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title">Xuất Danh Mục Trích Dẫn</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Xuất trọn bộ {resources.length} tài liệu đang lọc theo chủ đề và định dạng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-4 bg-stone-50/50 dark:bg-stone-900/50 overflow-x-auto scrollbar-thin">
          {[
            { id: 'apa' as CitationFormat, label: 'APA 7th', testId: 'batch-tab-apa' },
            { id: 'mla' as CitationFormat, label: 'MLA 9th', testId: 'batch-tab-mla' },
            { id: 'chicago' as CitationFormat, label: 'Chicago 17th', testId: 'batch-tab-chicago' },
            { id: 'ieee' as CitationFormat, label: 'IEEE', testId: 'batch-tab-ieee' },
            { id: 'harvard' as CitationFormat, label: 'Harvard', testId: 'batch-tab-harvard' },
            { id: 'bibtex' as CitationFormat, label: 'BibTeX (.bib)', testId: 'batch-tab-bibtex' },
            { id: 'ris' as CitationFormat, label: 'RIS (.ris)', testId: 'batch-tab-ris' },
            { id: 'markdown' as CitationFormat, label: 'Markdown (.md)', testId: 'batch-tab-markdown' },
          ].map((tab) => (
            <button
              key={tab.id}
              data-testid={tab.testId}
              onClick={() => handleFormatChange(tab.id)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                format === tab.id
                  ? 'border-amber-700 dark:border-amber-400 text-amber-900 dark:text-amber-300'
                  : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body & Preview */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-semibold uppercase tracking-wider">
              <span>
                {format === 'apa' && 'Danh mục tham chiếu APA 7th (Tự động xếp theo thứ tự ABC):'}
                {format === 'mla' && 'Danh mục tham chiếu MLA 9th (Sắp xếp theo chuẩn MLA):'}
                {format === 'chicago' && 'Danh mục tham chiếu Chicago 17th (Author-Date):'}
                {format === 'ieee' && 'Danh mục tham chiếu IEEE (Đánh số thứ tự [1], [2]...):'}
                {format === 'harvard' && 'Danh mục tham chiếu Harvard (Author-Date):'}
                {format === 'bibtex' && 'Tệp cơ sở dữ liệu BibTeX (Tương thích Zotero, Mendeley, Overleaf):'}
                {format === 'ris' && 'Tệp định dạng RIS (Tương thích Zotero, EndNote, Mendeley):'}
                {format === 'markdown' && 'Danh sách Footnotes liên tục (Tương thích Obsidian):'}
              </span>
              <span className="text-stone-400 dark:text-stone-500 font-mono text-[11px]">
                {resources.length} mục
              </span>
            </div>
            <textarea
              data-testid="batch-citation-preview"
              readOnly
              value={batchContent}
              rows={9}
              className="w-full p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 select-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
            <span>Tệp tải về: <code className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded font-mono border border-stone-200 dark:border-stone-700">{filename}</code></span>
            {copied && (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đã sao chép
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 transition"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
              {copied ? 'Đã sao chép' : 'Sao chép toàn bộ'}
            </button>

            <button
              type="button"
              data-testid="batch-btn-download"
              onClick={handleDownload}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <FileDown className="w-3.5 h-3.5" /> Tải tệp ({filename})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
