import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { X, Download, Upload, RefreshCw, FileText, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportImportModal({ isOpen, onClose }: ExportImportModalProps) {
  const { exportAllDataJSON, importAllDataJSON, resetToDefaultData, topics, notes } = useData();
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'markdown' | 'reset'>('export');

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    const dataStr = exportAllDataJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phat-hoc-huyen-hoc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    let md = `# BÁO CÁO TỔNG HỢP NGHIÊN CỨU PHẬT HỌC & HUYỀN HỌC\n*Xuất bản ngày: ${new Date().toLocaleDateString('vi-VN')}*\n\n---\n\n`;
    
    md += `## 1. DANH MỤC CÁC CHỦ ĐỀ NGHIÊN CỨU (${topics.length} topics)\n\n`;
    topics.forEach((t, i) => {
      md += `### ${i + 1}. [${t.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}] ${t.title}\n`;
      md += `- **Danh mục**: ${t.categoryName}\n`;
      md += `- **Tiến độ**: ${t.studyProgress.progress}% (${t.studyProgress.status})\n`;
      md += `- **Thời gian nghiên cứu**: ${t.studyProgress.timeSpent} phút\n`;
      md += `- **Mô tả**: ${t.description}\n\n`;
      md += `${t.content}\n\n`;
      md += `---\n\n`;
    });

    md += `## 2. TỔNG HỢP GHI CHÚ CHUYÊN SÂU (${notes.length} notes)\n\n`;
    notes.forEach((n, i) => {
      md += `### Ghi chú ${i + 1}: ${n.title} [${n.type.toUpperCase()}]\n`;
      md += `*Gắn liền với: ${n.topicTitle}*\n\n`;
      md += `${n.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tong-hop-nghien-cuu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(exportAllDataJSON());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const success = importAllDataJSON(importText.trim());
    if (success) {
      setImportStatus('success');
      setTimeout(() => {
        onClose();
        setImportStatus('idle');
      }, 1200);
    } else {
      setImportStatus('error');
    }
  };

  const handleResetConfirm = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu gốc ban đầu không? Mọi chỉnh sửa tùy biến sẽ được làm mới.')) {
      resetToDefaultData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Sao Lưu &amp; Xuất Dữ Liệu</h2>
              <p className="text-xs text-stone-600">Export JSON, Báo cáo Markdown, hoặc Khôi phục</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-100/50">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Xuất JSON
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'markdown'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Báo cáo Markdown
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Nhập Dữ Liệu
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Khôi Phục Gốc
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Xuất toàn bộ hệ thống gồm {topics.length} chủ đề, {notes.length} ghi chú, tài liệu và tiến độ học tập thành file JSON tiêu chuẩn để lưu trữ an toàn.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadJSON}
                  className="flex-1 py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Download className="w-4 h-4" /> Tải Xuống File JSON Backup
                </button>
                <button
                  onClick={handleCopyJSON}
                  className="py-3 px-4 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-medium text-sm flex items-center gap-2 transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép!' : 'Sao chép JSON'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Tổng hợp toàn bộ tài liệu, giáo án phân tích Abhidharma, Tam Thức, Kinh Dịch và ghi chú thành một tài liệu Markdown hoàn chỉnh tương thích Obsidian và Notion.
              </p>
              <button
                onClick={handleDownloadMarkdown}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition"
              >
                <FileText className="w-4 h-4" /> Xuất Báo Cáo Markdown Toàn Bộ (.md)
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Dán nội dung JSON sao lưu vào đây:
              </label>
              <textarea
                rows={7}
                required
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{ "categories": [...], "topics": [...], "notes": [...] }'
                className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700"
              />

              {importStatus === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Nhập dữ liệu thành công!
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Định dạng JSON không hợp lệ! Vui lòng kiểm tra lại cấu trúc.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Bắt Đầu Khôi Phục Dữ Liệu
              </button>
            </form>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Khôi phục về dữ liệu nghiên cứu ban đầu?</h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto mt-1">
                  Hệ thống sẽ nạp lại đầy đủ bộ giáo lý Abhidharma 7 bộ, Tam Tạng, Thiền định, Kỳ Môn Độn Giáp, Thái Ất, Tử Vi, Kinh Dịch và các ghi chú mẫu.
                </p>
              </div>
              <button
                onClick={handleResetConfirm}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition"
              >
                Xác Nhận Khôi Phục Gốc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
