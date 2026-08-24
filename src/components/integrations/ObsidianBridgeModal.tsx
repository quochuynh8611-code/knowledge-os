import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Share2,
  Download,
  ExternalLink,
  CheckCircle2,
  FolderSync,
  FileCode,
  Copy,
  Sparkles,
  Layers,
  BookOpen,
  PlusCircle,
} from 'lucide-react';
import {
  getStoredVaultName,
  setStoredVaultName,
  getObsidianOpenUri,
  getObsidianNewNoteUri,
  generateObsidianVaultZip,
  formatTopicForObsidian,
  sanitizeFileName,
} from '../../lib/obsidian';
import { Topic } from '../../types';

interface ObsidianBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

export function ObsidianBridgeModal({ isOpen, onClose, topic }: ObsidianBridgeModalProps) {
  const { topics, notes, resources, categories } = useData();
  const [vaultName, setVaultName] = useState(getStoredVaultName());
  const [isExporting, setIsExporting] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    setVaultName(getStoredVaultName());
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTopic = topic || topics[0];

  const handleSaveVaultName = (val: string) => {
    setVaultName(val);
    setStoredVaultName(val);
  };

  const handleDownloadVaultZip = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const blob = await generateObsidianVaultZip(topics, notes, resources, categories, vaultName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vaultName || 'Obsidian-Vault'}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (e) {
      console.error('Failed to export vault zip', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyFormattedMarkdown = async () => {
    if (!currentTopic) return;
    try {
      const md = formatTopicForObsidian(currentTopic, notes);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      }
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown to clipboard', err);
    }
  };

  const openInObsidianLink = currentTopic
    ? getObsidianOpenUri(
        vaultName,
        `${currentTopic.type === 'phat-hoc' ? 'Phat-Hoc' : 'Huyen-Hoc'}/${sanitizeFileName(currentTopic.title)}`
      )
    : '';

  const createInObsidianLink = currentTopic
    ? getObsidianNewNoteUri(
        vaultName,
        sanitizeFileName(currentTopic.title),
        formatTopicForObsidian(currentTopic, notes)
      )
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-purple-50 flex items-center justify-center font-bold shadow-xs">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Obsidian Real-Time Vault Bridge
                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-900 font-mono font-bold rounded-full">
                  obsidian:// protocol
                </span>
              </h2>
              <p className="text-xs text-stone-600">
                Đồng bộ hai chiều, tạo ghi chú chuẩn [[Wiki Links]] &amp; YAML Frontmatter
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-stone-700">
          {/* Vault Name Setting */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
              Tên Obsidian Vault của bạn:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vaultName}
                onChange={(e) => handleSaveVaultName(e.target.value)}
                placeholder="Ví dụ: Khao-Cuu-Phat-Hoc hoặc Obsidian-Vault"
                className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
              <span className="self-center text-[11px] text-stone-500 italic">
                (Tự động lưu)
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Khớp với tên thư mục Vault bạn đã mở trong phần mềm Obsidian trên máy tính / điện thoại.
            </p>
          </div>

          {/* Direct URI Triggers for current topic */}
          {currentTopic && (
            <div className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  Chủ đề hiện tại: {currentTopic.title}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-semibold">
                  {currentTopic.type}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Direct Open Link (obsidian://open) */}
                <a
                  href={openInObsidianLink}
                  className="px-3.5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tạo / Mở Ngay trong Obsidian App</span>
                </a>

                {/* Copy Markdown */}
                <button
                  onClick={handleCopyFormattedMarkdown}
                  className="px-3.5 py-2.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {copiedNote ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNote ? 'Đã sao chép Markdown!' : 'Sao chép Note (+ Frontmatter)'}</span>
                </button>
              </div>

              {/* Secondary Create Note URI */}
              <div className="text-center pt-1">
                <a
                  href={createInObsidianLink}
                  className="text-[11px] text-purple-800 hover:text-purple-950 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3 text-purple-700" />
                  <span>Hoặc tạo note mới kèm toàn bộ nội dung Markdown (obsidian://new)</span>
                </a>
              </div>
            </div>
          )}

          {/* Full Vault Export Package */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Download className="w-4 h-4 text-amber-700" />
              <span>Đóng gói Trọn Bộ Obsidian Vault (.zip)</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tạo và tải về file nén chứa 100% cây thư mục hoàn chỉnh gồm {topics.length} chủ đề, {notes.length} ghi chú, file tổng quan <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono">00_Map_Of_Content.md</code> và toàn bộ liên kết hai chiều <code className="bg-stone-100 px-1 py-0.5 rounded text-purple-900 font-mono">[[Wiki Links]]</code> để bạn giải nén trực tiếp vào Obsidian.
            </p>

            {exportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã đóng gói thành công! Bạn có thể giải nén vào thư mục Vault trên máy.</span>
              </div>
            )}

            <button
              onClick={handleDownloadVaultZip}
              disabled={isExporting}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo cây thư mục Vault...' : 'Tải Xuống Trọn Bộ Obsidian Vault (.zip)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
