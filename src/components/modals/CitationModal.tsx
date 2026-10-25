import React, { useState, useMemo } from 'react';
import { Resource } from '../../types';
import { generateAllCitations } from '../../lib/citationGenerator';
import {
  CitationFormat,
  getStoredCitationFormat,
  setStoredCitationFormat,
} from '../../lib/citationPreferences';
import { X, Copy, Check, Quote, BookOpen, Code, FileText } from 'lucide-react';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
}

export function CitationModal({ isOpen, onClose, resource }: CitationModalProps) {
  const [format, setFormat] = useState<CitationFormat>(getStoredCitationFormat);
  const [copied, setCopied] = useState(false);

  const citations = useMemo(() => {
    if (!resource) return null;
    return generateAllCitations(resource);
  }, [resource]);

  if (!isOpen || !resource || !citations) return null;

  const currentCitation = citations[format];

  const handleFormatChange = (newFormat: CitationFormat) => {
    setFormat(newFormat);
    setStoredCitationFormat(newFormat);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentCitation);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trích dẫn học thuật"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title">Trích Dẫn Học Thuật</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 max-w-md">
                {resource.title}
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
            { id: 'apa' as CitationFormat, label: 'APA 7th', testId: 'tab-citation-apa' },
            { id: 'mla' as CitationFormat, label: 'MLA 9th', testId: 'tab-citation-mla' },
            { id: 'chicago' as CitationFormat, label: 'Chicago 17th', testId: 'tab-citation-chicago' },
            { id: 'ieee' as CitationFormat, label: 'IEEE', testId: 'tab-citation-ieee' },
            { id: 'harvard' as CitationFormat, label: 'Harvard', testId: 'tab-citation-harvard' },
            { id: 'bibtex' as CitationFormat, label: 'BibTeX', testId: 'tab-citation-bibtex' },
            { id: 'ris' as CitationFormat, label: 'RIS', testId: 'tab-citation-ris' },
            { id: 'markdown' as CitationFormat, label: 'Markdown', testId: 'tab-citation-markdown' },
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

        {/* Body & Citation Preview */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
              {format === 'apa' && 'Định dạng APA 7th (Chuẩn tham chiếu bài báo & luận văn):'}
              {format === 'mla' && 'Định dạng MLA 9th (Nhân văn, Văn học & Nghệ thuật):'}
              {format === 'chicago' && 'Định dạng Chicago 17th (Lịch sử & Khoa học Xã hội):'}
              {format === 'ieee' && 'Định dạng IEEE (Kỹ thuật điện & Khoa học Máy tính):'}
              {format === 'harvard' && 'Định dạng Harvard (Kinh tế, Quản trị & Y sinh):'}
              {format === 'bibtex' && 'Khối BibTeX (Tương thích Zotero, LaTeX & Overleaf):'}
              {format === 'ris' && 'Định dạng RIS (Zotero, EndNote & Mendeley):'}
              {format === 'markdown' && 'Định dạng Markdown Footnote (Tương thích Obsidian & cá nhân):'}
            </label>
            <textarea
              data-testid="citation-preview"
              readOnly
              value={currentCitation}
              rows={format === 'bibtex' || format === 'ris' ? 8 : 4}
              className="w-full p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 select-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
            <span>Định dạng tự động dựa trên metadata có sẵn</span>
            {copied && (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đã sao chép
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition ${
              copied
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-amber-700 hover:bg-amber-800 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Đã sao chép
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Sao chép trích dẫn
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
