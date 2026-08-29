import React, { useState, useMemo, useEffect } from 'react';
import type { LexiconEntry, SystemNode, MatrixRelation } from '../../types/scholarSuite';
import {
  generateScholarCitations,
  ScholarCitationFormat,
} from '../../lib/scholarCitation/generator';
import {
  X,
  Copy,
  Check,
  Quote,
  BookOpen,
  Code,
  FileText,
  Download,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';

export interface ScholarCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: LexiconEntry | null;
  node?: SystemNode | null;
  relation?: MatrixRelation | null;
}

export function ScholarCitationModal({
  isOpen,
  onClose,
  entry,
  node,
  relation,
}: ScholarCitationModalProps) {
  const [format, setFormat] = useState<ScholarCitationFormat>('bibtex');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetItem = entry || node || relation;

  const result = useMemo(() => {
    if (!targetItem) return null;
    return generateScholarCitations(targetItem);
  }, [targetItem]);

  if (!isOpen || !targetItem || !result) return null;

  const { viewModel, isBlocked } = result;

  const getPreviewText = (): string => {
    switch (format) {
      case 'bibtex':
        return result.bibtex || '';
      case 'csl':
        return result.cslJsonString || '';
      case 'apa':
        return result.apa || '';
      case 'chicago':
        return result.chicago || '';
      case 'mla':
        return result.mla || '';
      case 'harvard':
        return result.harvard || '';
      default:
        return '';
    }
  };

  const currentPreview = getPreviewText();

  const handleCopy = async () => {
    if (!currentPreview) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentPreview);
        setCopied(true);
        setCopyError(null);
        setStatusMessage(`Đã sao chép trích dẫn định dạng ${format.toUpperCase()} vào clipboard.`);
        setTimeout(() => {
          setCopied(false);
          setStatusMessage('');
        }, 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      setCopied(false);
      setCopyError('Không thể sao chép vào clipboard. Vui lòng chọn và sao chép thủ công.');
      setStatusMessage('Lỗi sao chép trích dẫn vào clipboard.');
      setTimeout(() => {
        setCopyError(null);
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleDownload = (type: 'bib' | 'json') => {
    const content = type === 'bib' ? result.bibtex : result.cslJsonString;
    if (!content) return;

    const mime = type === 'bib' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const filename = `${viewModel.citationKey || 'citation'}.${type}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(`Đã tải tệp .${type} thành công.`);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Live status announcement for screen readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Trích Dẫn Học Thuật</h2>
              <p className="text-xs text-stone-600 line-clamp-1 max-w-md">
                {viewModel.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg transition cursor-pointer"
            title="Đóng (Esc)"
            aria-label="Đóng hộp thoại trích dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        {!isBlocked && (
          <div className="flex flex-wrap border-b border-stone-200 px-4 bg-stone-100/50">
            <button
              onClick={() => { setFormat('bibtex'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'bibtex'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> BibTeX
            </button>
            <button
              onClick={() => { setFormat('csl'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'csl'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> CSL JSON
            </button>
            <button
              onClick={() => { setFormat('apa'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'apa'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> APA 7th
            </button>
            <button
              onClick={() => { setFormat('chicago'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'chicago'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Chicago
            </button>
            <button
              onClick={() => { setFormat('mla'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'mla'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              MLA 9th
            </button>
            <button
              onClick={() => { setFormat('harvard'); setCopied(false); setCopyError(null); }}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1 cursor-pointer ${
                format === 'harvard'
                  ? 'border-amber-700 text-amber-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              Harvard
            </button>
          </div>
        )}

        {/* Body & Citation Preview */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Relational Evidence & Context Isolation */}
          {relation && (
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-800" />
                  <span className="font-bold text-stone-800 uppercase tracking-wide text-[11px]">
                    Ngữ Cảnh Quan Hệ Ma Trận
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-200 text-amber-900 uppercase">
                    {relation.relationType}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-stone-200 text-stone-700 border border-stone-300">
                    {relation.evidenceLevel}
                  </span>
                </div>
              </div>

              {relation.canonicalEvidence && (
                <div className="p-2.5 bg-white rounded-lg border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-900 block">
                    Bằng chứng văn bản nguyên bản:
                  </span>
                  <p className="text-xs text-stone-700 italic leading-relaxed">
                    {relation.canonicalEvidence}
                  </p>
                </div>
              )}

              {relation.interpretiveNote && (
                <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/70 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-950">
                    <Info className="w-3 h-3 text-amber-700" />
                    <span>Chú giải phân tích học thuật (Không phải nguồn nguyên bản):</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {relation.interpretiveNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {isBlocked ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Không đủ điều kiện xuất trích dẫn học thuật</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">
                Mục từ này ở trạng thái phác thảo (stub/partial), chưa có văn bản nguồn xác thực. Để đảm bảo tính liêm chính học thuật (Scholarly Integrity), hệ thống không cho phép xuất trích dẫn này.
              </p>
              {viewModel.provenanceNote && (
                <div className="text-[11px] font-mono text-stone-600 bg-white/70 p-2 rounded border border-amber-150">
                  <span className="font-semibold">Ghi chú biên tập:</span> {viewModel.provenanceNote}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                <span>
                  {format === 'bibtex' && 'BibTeX Entry (Tương thích LaTeX, Overleaf & Zotero):'}
                  {format === 'csl' && 'CSL JSON 1.0.2 Object (Chuẩn Zotero & Mendeley):'}
                  {format === 'apa' && 'Định dạng APA 7th Edition:'}
                  {format === 'chicago' && 'Định dạng Chicago 17th Notes (s.v.):'}
                  {format === 'mla' && 'Định dạng MLA 9th Edition:'}
                  {format === 'harvard' && 'Định dạng Harvard Reference Style:'}
                </span>
                {viewModel.citationKey && (
                  <span className="text-[10px] font-mono text-stone-500">
                    Key: {viewModel.citationKey}
                  </span>
                )}
              </div>
              <textarea
                data-testid="scholar-citation-preview"
                readOnly
                value={currentPreview}
                rows={format === 'bibtex' || format === 'csl' ? 8 : 4}
                className="w-full p-3.5 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-600 select-all leading-relaxed"
              />
            </div>
          )}

          {!isBlocked && (
            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span>Định dạng tự động dựa trên nguồn gốc kinh điển đã xác minh</span>
              {copied && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã sao chép
                </span>
              )}
              {copyError && (
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {copyError}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-100 flex items-center justify-between gap-2.5">
          <div>
            {!isBlocked && (
              <div className="flex items-center gap-2">
                {result.bibtex && (
                  <button
                    onClick={() => handleDownload('bib')}
                    className="px-2.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="Tải tệp .bib"
                  >
                    <Download className="w-3 h-3" /> Tải .bib
                  </button>
                )}
                {result.csl && (
                  <button
                    onClick={() => handleDownload('json')}
                    className="px-2.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="Tải tệp .json (CSL)"
                  >
                    <Download className="w-3 h-3" /> Tải .json
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
            {!isBlocked && (
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
