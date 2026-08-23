import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Sparkles,
  Send,
  BookOpen,
  Share2,
  Brain,
  Copy,
  CheckCircle2,
  Compass,
  RefreshCw,
  PlusCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Topic } from '../../types';

interface AIResearchStudioProps {
  currentTopic?: Topic;
  onClose?: () => void;
}

export function AIResearchStudio({ currentTopic, onClose }: AIResearchStudioProps) {
  const { topics, notes, addNote } = useData();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(currentTopic?.id || topics[0]?.id || '');
  const [researchMode, setResearchMode] = useState<'scholar_analysis' | 'pali_sanskrit_exegesis' | 'cross_domain_link'>('scholar_analysis');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedAsNote, setSavedAsNote] = useState(false);

  const activeTopic = topics.find((t) => t.id === selectedTopicId) || currentTopic || topics[0];
  const topicNotes = notes.filter((n) => n.topicId === activeTopic?.id);

  const quickPrompts = [
    {
      label: 'Phân tích Vi Diệu Pháp & Tâm Sở',
      prompt: 'Hãy phân tích chi tiết các Tâm sở (Cetasika) đồng sanh hoặc tương ưng với chủ đề này, đối chiếu theo Luận tạng Abhidhamma.',
      mode: 'scholar_analysis' as const,
    },
    {
      label: 'Tra Cứu Gốc Từ Pali / Sanskrit / Hán Cổ',
      prompt: 'Chiết tự và tra cứu nguyên ngữ gốc Pali (IAST), Sanskrit và đối chiếu chữ Hán cổ cho các thuật ngữ trọng tâm trong chủ đề này.',
      mode: 'pali_sanskrit_exegesis' as const,
    },
    {
      label: 'Đối Chiếu Phật Học & Dịch Học / Kỳ Môn',
      prompt: 'Phân tích mối tương quan học thuật và triết lý giữa chủ đề này với quy luật Âm Dương Ngũ Hành, 64 Quẻ Dịch hoặc Kỳ Môn Độn Giáp.',
      mode: 'cross_domain_link' as const,
    },
    {
      label: 'Lộ Trình Tiến Trình Tâm (Citta Vīthi) & Thiền Tuệ',
      prompt: 'Giải thích tiến trình lộ tâm (Citta Vīthi) và ứng dụng thực tiễn vào các tầng Tuệ Minh Sát (Vipassanā-ñāṇa) liên quan.',
      mode: 'scholar_analysis' as const,
    },
  ];

  const handleExecuteResearch = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || !activeTopic) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSavedAsNote(false);

    try {
      const contextNotesSummary = topicNotes.map((n) => `[${n.title}]: ${n.content}`).join('\n\n');

      const response = await fetch('/api/gemini/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          topicTitle: activeTopic.title,
          category: activeTopic.categoryName || activeTopic.type,
          contextNotes: contextNotesSummary,
          mode: researchMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi kết nối máy chủ AI.');
      }

      setResearchResult(data.result);
    } catch (err: any) {
      console.error('Research error:', err);
      setErrorMsg(err.message || 'Không thể thực hiện khảo cứu AI lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotes = () => {
    if (!researchResult || !activeTopic) return;
    addNote({
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      title: `Khảo cứu Antigravity AI: ${prompt.slice(0, 40) || 'Phân tích học thuật'}`,
      content: `> **Câu hỏi khảo cứu:** ${prompt || 'Khảo cứu chuyên sâu'}\n\n${researchResult}`,
      type: 'insight',
      isPrivate: false,
      tags: ['AI-Research', 'Antigravity', activeTopic.type],
    });
    setSavedAsNote(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(researchResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xl flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="p-4 md:px-6 md:py-4 bg-gradient-to-r from-amber-900 to-stone-900 text-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">
                Antigravity AI Scholar &amp; Research Engine
              </h2>
              <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-semibold">
                Gemini 2.5 Active
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Trợ lý khảo cứu ngữ nghĩa sâu, phân tích Vi Diệu Pháp, Tam Tạng &amp; Huyền học Đông phương
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white px-2.5 py-1 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-xs font-semibold"
          >
            Đóng
          </button>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-4 border-b border-stone-200 bg-stone-50/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Select topic */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
              Chủ đề khảo cứu đang chọn:
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-700"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}] {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Select research mode */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
              Chế độ khảo cứu chuyên biệt:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-stone-200/80 p-1 rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setResearchMode('scholar_analysis')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                  researchMode === 'scholar_analysis' ? 'bg-white text-amber-950 shadow-xs' : 'text-stone-700'
                }`}
              >
                Luận Tạng
              </button>
              <button
                type="button"
                onClick={() => setResearchMode('pali_sanskrit_exegesis')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                  researchMode === 'pali_sanskrit_exegesis' ? 'bg-white text-amber-950 shadow-xs' : 'text-stone-700'
                }`}
              >
                Gốc Từ Pali/Hán
              </button>
              <button
                type="button"
                onClick={() => setResearchMode('cross_domain_link')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                  researchMode === 'cross_domain_link' ? 'bg-white text-amber-950 shadow-xs' : 'text-stone-700'
                }`}
              >
                Đối Chiếu Dịch Lý
              </button>
            </div>
          </div>
        </div>

        {/* Quick prompt badges */}
        <div>
          <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
            Gợi ý truy vấn học thuật nhanh:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(qp.prompt);
                  setResearchMode(qp.mode);
                  handleExecuteResearch(qp.prompt);
                }}
                className="text-[11px] px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg transition text-left"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-stone-50/50 space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Thông báo từ hệ thống AI:</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-700 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-stone-800">
              Antigravity Scholar đang đối chiếu Tam Tạng, Abhidharma và Cổ tịch...
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Đang phân tích cấu trúc tâm sở, nguyên ngữ Pali/Sanskrit và quan hệ đối chiếu học thuật.
            </p>
          </div>
        ) : researchResult ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-800" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Kết Quả Khảo Cứu Chuyên Sâu
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center gap-1.5 transition font-medium"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
                <button
                  onClick={handleSaveToNotes}
                  disabled={savedAsNote}
                  className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 transition font-medium ${
                    savedAsNote
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                  }`}
                >
                  {savedAsNote ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>{savedAsNote ? 'Đã lưu vào Ghi chú' : 'Lưu thành Note'}</span>
                </button>
              </div>
            </div>

            {/* Markdown Body */}
            <div className="prose prose-stone max-w-none text-stone-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {researchResult}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs font-medium">
              Chọn một câu hỏi gợi ý phía trên hoặc nhập thắc mắc khảo cứu của bạn vào ô bên dưới để bắt đầu.
            </p>
          </div>
        )}
      </div>

      {/* Footer Query Bar */}
      <div className="p-3 md:p-4 bg-white border-t border-stone-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteResearch();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Đặt câu hỏi khảo cứu cho chủ đề "${activeTopic?.title || 'Phật học & Dịch học'}"...`}
            className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-700/50"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Khảo Cứu</span>
          </button>
        </form>
      </div>
    </div>
  );
}
