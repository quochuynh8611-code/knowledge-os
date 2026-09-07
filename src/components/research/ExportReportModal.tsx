import React, { useState, useMemo, useEffect } from "react";
import type { Note, Resource, Topic } from "../../types";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  generateResearchReport,
  downloadMarkdownReport,
  type ReportSectionSelection,
} from "../../lib/researchReportGenerator";
import {
  Download,
  Printer,
  Copy,
  Check,
  X,
  FileText,
  Sliders,
  Eye,
  FileDown,
} from "lucide-react";

export interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic;
  categoryTitle?: string;
  notes?: Note[];
  flashcards?: Flashcard[];
  reviews?: FlashcardReview[];
  resources?: Resource[];
}

export function ExportReportModal({
  isOpen,
  onClose,
  topic,
  categoryTitle,
  notes = [],
  flashcards = [],
  reviews = [],
  resources = [],
}: ExportReportModalProps) {
  const [sections, setSections] = useState<ReportSectionSelection>({
    overview: true,
    notes: true,
    flashcards: true,
    resources: true,
    timeline: true,
  });

  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "config">("preview");

  // Generate markdown report dynamically based on selected sections
  const reportMarkdown = useMemo(() => {
    return generateResearchReport({
      topic,
      categoryTitle,
      notes,
      flashcards,
      reviews,
      resources,
      sections,
    });
  }, [topic, categoryTitle, notes, flashcards, reviews, resources, sections]);

  // Suggested filename: research-report-{slug}-{date}.md
  const defaultFilename = useMemo(() => {
    const slug = (topic.slug || topic.title || "topic")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const dateStr = new Date().toISOString().split("T")[0];
    return `research-report-${slug}-${dateStr}.md`;
  }, [topic]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleDownload = () => {
    downloadMarkdownReport(reportMarkdown, defaultFilename);
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="export-report-modal"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Xuất Báo Cáo Nghiên Cứu: {topic.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng hợp báo cáo Markdown hoàn chỉnh kèm bảng chỉ số, ghi chú, flashcards và tài liệu nguồn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            data-testid="close-export-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeView === "preview"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              data-testid="tab-preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước Markdown</span>
            </button>
            <button
              onClick={() => setActiveView("config")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeView === "config"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              data-testid="tab-config"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tùy chọn mục xuất</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Tệp: {defaultFilename}
          </span>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeView === "config" ? (
            <div className="space-y-4 max-w-xl mx-auto py-2" data-testid="export-config-panel">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Chọn các phần muốn đưa vào báo cáo:
              </h4>

              <div className="space-y-2.5">
                {[
                  {
                    key: "overview",
                    label: "1. Tổng quan chỉ số tri thức",
                    desc: "Bảng tổng hợp số lượng ghi chú, thẻ flashcard, retention rate, streak, thời gian học.",
                  },
                  {
                    key: "notes",
                    label: "2. Ghi chú nghiên cứu",
                    desc: "Danh sách toàn bộ các bài ghi chú kèm ngày tạo, thẻ phân loại và nội dung chi tiết.",
                  },
                  {
                    key: "flashcards",
                    label: "3. Flashcards & Trạng thái SRS",
                    desc: "Bảng câu hỏi, đáp án, trạng thái ghi nhớ và chu kỳ lặp lại ngắt quãng.",
                  },
                  {
                    key: "resources",
                    label: "4. Tài liệu tham khảo & Nguồn",
                    desc: "Các liên kết, sách tham khảo, tài liệu đính kèm và trích yếu ghi chú nguồn.",
                  },
                  {
                    key: "timeline",
                    label: "5. Dòng thời gian nghiên cứu",
                    desc: "15 mốc sự kiện ghi nhận quá trình tạo và ôn tập tri thức gần nhất.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[item.key as keyof ReportSectionSelection]}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                      data-testid={`checkbox-${item.key}`}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2" data-testid="export-preview-panel">
              <pre className="p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[50vh]">
                {reportMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
              data-testid="copy-markdown-btn"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Đã chép!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Sao chép Markdown</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
              title="In hoặc lưu dạng PDF"
              data-testid="print-report-btn"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In / PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-xl"
            >
              Đóng
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              data-testid="download-report-btn"
            >
              <Download className="w-4 h-4" />
              <span>Tải file .md (UTF-8 BOM)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
