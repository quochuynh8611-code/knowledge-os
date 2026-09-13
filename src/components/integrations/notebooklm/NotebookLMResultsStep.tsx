import React from 'react';
import {
  Headphones,
  BookOpen,
  UploadCloud,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { NotebookLMResultsStepProps } from './types';
import {
  getHumanReadableArtifactStatus,
  mapLocalArtifactTypeToDTO,
  mapLocalArtifactStatusToDTO,
} from './utils';
import { NotebookLMArtifactType } from '../../../lib/notebooklm';

export function NotebookLMResultsStep({
  currentTopic,
  localArtifacts,
  sessionArtifacts,
  currentSession,
  showAddArtifact,
  onToggleShowAddArtifact,
  artifactType,
  onSelectArtifactType,
  artifactTitle,
  onChangeArtifactTitle,
  artifactContent,
  onChangeArtifactContent,
  notebookUrl,
  onChangeNotebookUrl,
  validationError,
  onSaveNewArtifact,
  onCancelAddArtifact,
  onFileUpload,
  onDeleteLocalArtifact,
  onReviewArtifact,
  onSelectTopicId,
  allTopics,
  onBackToPrompt,
}: NotebookLMResultsStepProps) {
  // Filter for current topic
  const displayLocalArtifacts = localArtifacts.filter(
    (a) => a.topicId === currentTopic?.id
  );
  const displaySessionArtifacts = sessionArtifacts.filter(
    (a) => a.topicId === currentTopic?.id
  );
  const dedupedSessionArtifacts = displaySessionArtifacts.filter(
    (sa) => !displayLocalArtifacts.some((la) => la.title === sa.title)
  );
  const totalArtifactCount =
    displayLocalArtifacts.length + dedupedSessionArtifacts.length;

  // Other topics that have local artifacts for Quick Switch
  const otherTopicsWithArtifacts = allTopics.filter((t) => {
    if (t.id === currentTopic?.id) return false;
    return localArtifacts.some((a) => a.topicId === t.id);
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar for Artifact Locker */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-stone-100 w-full sm:w-auto">
          <Headphones className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>Kho Kết Quả Từ NotebookLM (Audio Overview &amp; Study Guides)</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Nạp Tệp Markdown</span>
            <input
              type="file"
              accept=".md,.txt"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onToggleShowAddArtifact}
            className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Kết Quả</span>
          </button>
        </div>
      </div>

      {/* 2. Topic Context Indicator Bar */}
      <div
        data-testid="artifact-locker-context-bar"
        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-xl text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-500 dark:text-stone-400">
            Chủ đề hiện hành:
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100">
            {currentTopic?.title || 'Chưa chọn'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="artifact-locker-count-badge"
            className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-800"
          >
            {totalArtifactCount} kết quả
          </span>
          {currentSession && (
            <span
              data-testid="artifact-locker-session-badge"
              className="px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-mono border border-stone-300 dark:border-stone-700 uppercase font-semibold"
            >
              Session: {currentSession.status}
            </span>
          )}
        </div>
      </div>

      {/* 3. Validation Error Alert */}
      {validationError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 4. Add Artifact Form */}
      {showAddArtifact && (
        <form
          onSubmit={onSaveNewArtifact}
          noValidate
          className="p-4 bg-stone-50 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Loại kết quả NotebookLM:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'audio_overview_summary', label: 'Audio Summary' },
                    { id: 'study_guide', label: 'Study Guide' },
                    { id: 'briefing_doc', label: 'Briefing Doc' },
                    { id: 'faq', label: 'FAQ' },
                    { id: 'source_pack', label: 'Source Pack' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectArtifactType(item.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      artifactType === item.id
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="artifact-title-input"
                className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1"
              >
                Tiêu đề kết quả:
              </label>
              <input
                id="artifact-title-input"
                type="text"
                value={artifactTitle}
                onChange={(e) => onChangeArtifactTitle(e.target.value)}
                placeholder="Ví dụ: Tóm tắt Podcast 2 Hosts về 89 Tâm Abhidharma"
                className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="artifact-url-input"
              className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1"
            >
              Link NotebookLM liên kết (tùy chọn):
            </label>
            <input
              id="artifact-url-input"
              type="text"
              value={notebookUrl}
              onChange={(e) => onChangeNotebookUrl(e.target.value)}
              placeholder="https://notebooklm.google.com/notebook/..."
              className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="artifact-content-textarea"
              className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1"
            >
              Nội dung tóm tắt / trích đoạn:
            </label>
            <textarea
              id="artifact-content-textarea"
              rows={4}
              value={artifactContent}
              onChange={(e) => onChangeArtifactContent(e.target.value)}
              placeholder="Dán nội dung tóm lược từ NotebookLM vào đây..."
              className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelAddArtifact}
              className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
            >
              Lưu Kết Quả
            </button>
          </div>
        </form>
      )}

      {/* 5. Artifacts Card List or Empty State */}
      {displayLocalArtifacts.length > 0 || displaySessionArtifacts.length > 0 ? (
        <div className="space-y-3">
          {/* Local / Migrated Artifacts */}
          {displayLocalArtifacts.map((art) => (
            <div
              key={art.id}
              className="p-3.5 bg-white dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 relative hover:border-blue-300 dark:hover:border-blue-700 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-stone-100">
                  {art.type === 'audio_overview_summary' ? (
                    <Headphones className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  )}
                  <span>{art.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    data-testid={`artifact-version-badge-${art.id}`}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold"
                  >
                    Source package v1
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
                    {art.source || 'antigravity-2.0'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {art.target || 'notebooklm'}
                  </span>
                  {art.notebookUrl && (
                    <a
                      href={art.notebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <ExternalLink className="w-3 h-3" /> Mở Notebook
                    </a>
                  )}

                  <button
                    type="button"
                    data-testid={`btn-open-review-drawer-${art.id}`}
                    onClick={() =>
                      onReviewArtifact({
                        id: art.id,
                        sessionId: currentSession?.id || 'local-session',
                        sourcePackageId: null,
                        sourcePackageVersion: 1,
                        topicId: art.topicId,
                        artifactType: mapLocalArtifactTypeToDTO(art.type),
                        title: art.title,
                        rawContent: art.content,
                        contentHash: 'local-hash',
                        idempotencyKey: `local-${art.id}`,
                        status: mapLocalArtifactStatusToDTO(art.status),
                        citationCount: 0,
                        createdAt: art.createdAt,
                        updatedAt: art.createdAt,
                      })
                    }
                    className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Thẩm định</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteLocalArtifact(art.id)}
                    className="text-stone-400 hover:text-rose-600 dark:text-stone-500 dark:hover:text-rose-400 p-1 cursor-pointer transition"
                    title="Xóa artifact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                {art.content}
              </p>
            </div>
          ))}

          {/* Backend Grounded Artifacts */}
          {dedupedSessionArtifacts.map((art) => {
            const statusInfo = getHumanReadableArtifactStatus(art.status);
            return (
              <div
                key={art.id}
                className="p-3.5 bg-white dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 relative hover:border-blue-300 dark:hover:border-blue-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-900 dark:text-stone-100">
                    {art.artifactType === 'study_guide' ? (
                      <BookOpen className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    ) : (
                      <Headphones className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    )}
                    <span>{art.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      data-testid={`artifact-version-badge-${art.id}`}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold"
                    >
                      Source package v{art.sourcePackageVersion || 1}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${statusInfo.badgeClass}`}
                      title={statusInfo.description}
                    >
                      {art.status}
                    </span>

                    <button
                      type="button"
                      data-testid={`btn-open-review-drawer-${art.id}`}
                      onClick={() => onReviewArtifact(art)}
                      className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Thẩm định &amp; Nhập</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-2">
                  {art.rawContent}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          data-testid="artifact-locker-empty-state"
          className="py-8 px-4 text-center space-y-3 bg-stone-50/50 dark:bg-stone-950/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Chưa có kết quả Audio Overview hay Study Guide nào được lưu cho chủ đề{' '}
              <span className="font-bold text-stone-900 dark:text-stone-100">
                "{currentTopic?.title}"
              </span>
              .
            </p>
            <p className="text-[11px]">
              Bạn có thể đóng gói tài liệu nguồn ở Bước 1 để gửi cho Antigravity hoặc nạp kết quả thủ công vào hệ thống.
            </p>
          </div>

          {otherTopicsWithArtifacts.length > 0 && (
            <div
              data-testid="artifact-locker-quick-switch"
              className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col items-center gap-2"
            >
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                Chủ đề khác đã có kết quả sẵn:
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {otherTopicsWithArtifacts.map((t) => {
                  const count = localArtifacts.filter((a) => a.topicId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`quick-switch-topic-${t.id}`}
                      onClick={() => onSelectTopicId(t.id)}
                      className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <span>{t.title}</span>
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Step Navigation Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToPrompt}
          className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại: Prompt</span>
        </button>
      </div>
    </div>
  );
}
