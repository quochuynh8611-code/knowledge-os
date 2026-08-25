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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Trích Dẫn Học Thuật</h2>
              <p className="text-xs text-stone-600 line-clamp-1 max-w-md">
                {resource.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-100/50">
          <button
            data-testid="tab-citation-apa"
            onClick={() => handleFormatChange('apa')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              format === 'apa'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> APA 7th Edition
          </button>
          <button
            data-testid="tab-citation-bibtex"
            onClick={() => handleFormatChange('bibtex')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              format === 'bibtex'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> BibTeX
          </button>
          <button
            data-testid="tab-citation-markdown"
            onClick={() => handleFormatChange('markdown')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              format === 'markdown'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Markdown Footnote
          </button>
        </div>

        {/* Body & Citation Preview */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">
              {format === 'apa' && 'Định dạng APA 7th (Chuẩn tham chiếu bài báo & luận văn):'}
              {format === 'bibtex' && 'Khối BibTeX (Tương thích Zotero, LaTeX & Overleaf):'}
              {format === 'markdown' && 'Định dạng Markdown Footnote (Tương thích Obsidian & cá nhân):'}
            </label>
            <textarea
              data-testid="citation-preview"
              readOnly
              value={currentCitation}
              rows={format === 'bibtex' ? 7 : 4}
              className="w-full p-3.5 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-600 select-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
            <span>Định dạng tự động dựa trên metadata có sẵn</span>
            {copied && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đã sao chép
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl transition"
          >
            Đóng
          </button>
          <button
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
