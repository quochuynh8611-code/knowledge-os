import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Resource, ResourceType } from '../../types';
import {
  X,
  FileText,
  Book,
  Video,
  Headphones,
  Globe,
  Link,
  FolderOpen,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { normalizeFilePath, classifyPathRelativeToRoot } from '../../lib/fileLibraryAudit';
import { safeGetLocalStorageItem } from '../../lib/storage';
import { uploadArchiveFile } from '../../services/dataRepository';
import { lookupDoiMetadata } from '../../lib/doiResolver';
import {
  extractAcademicMetadataFromResource,
  embedAcademicMetadataInNotes,
} from '../../lib/citationGenerator';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: Resource | null;
  defaultTopicId?: string;
}

export function ResourceFormModal({ isOpen, onClose, initialResource, defaultTopicId }: ResourceFormModalProps) {
  const { topics, addResource, updateResource } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('pdf');
  const [author, setAuthor] = useState('');
  const [sourceMode, setSourceMode] = useState<'web' | 'local'>('web');
  const [url, setUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [openTarget, setOpenTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Academic metadata states
  const [doi, setDoi] = useState('');
  const [year, setYear] = useState('');
  const [journal, setJournal] = useState('');
  const [publisher, setPublisher] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [isbn, setIsbn] = useState('');
  const [isLookingUpDoi, setIsLookingUpDoi] = useState(false);
  const [doiLookupStatus, setDoiLookupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAcademicFields, setShowAcademicFields] = useState(false);

  const canonicalLibraryRoot = safeGetLocalStorageItem('knowledge_os_library_root_path') || '';

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setSelectedFile(null);
    setIsUploading(false);
    setDoiLookupStatus(null);
    if (initialResource) {
      const meta = extractAcademicMetadataFromResource(initialResource);
      setTopicId(initialResource.topicId);
      setTitle(initialResource.title);
      setType(initialResource.type);
      setAuthor(initialResource.author || '');
      if (initialResource.filePath && !initialResource.url) {
        setSourceMode('local');
      } else {
        setSourceMode('web');
      }
      setUrl(initialResource.url || '');
      setFilePath(initialResource.filePath || '');
      setOpenTarget(initialResource.openTarget || '');
      setNotes(meta.cleanNotes || '');
      setDoi(meta.doi || '');
      setYear(meta.year || '');
      setJournal(meta.journal || '');
      setPublisher(meta.publisher || '');
      setVolume(meta.volume || '');
      setIssue(meta.issue || '');
      setPages(meta.pages || '');
      setIsbn(meta.isbn || '');
      if (meta.doi || meta.journal || meta.year || meta.publisher) {
        setShowAcademicFields(true);
      }
    } else {
      setTopicId(defaultTopicId || topics[0]?.id || '');
      setTitle('');
      setType('pdf');
      setAuthor('');
      setSourceMode('web');
      setUrl('https://');
      setFilePath('');
      setOpenTarget('');
      setNotes('');
      setDoi('');
      setYear('');
      setJournal('');
      setPublisher('');
      setVolume('');
      setIssue('');
      setPages('');
      setIsbn('');
      setShowAcademicFields(false);
    }
  }, [initialResource, defaultTopicId, isOpen]);

  const handleLookupDoi = async () => {
    if (!doi.trim()) {
      setDoiLookupStatus({ type: 'error', message: 'Vui lòng nhập mã DOI hoặc URL DOI hợp lệ.' });
      return;
    }
    setIsLookingUpDoi(true);
    setDoiLookupStatus(null);
    try {
      const res = await lookupDoiMetadata(doi);
      if (res.status === 'success' && res.data) {
        const m = res.data;
        if (m.title) setTitle(m.title);
        if (m.author) setAuthor(m.author);
        if (m.url) {
          setUrl(m.url);
          setSourceMode('web');
        }
        if (m.type) setType(m.type);
        if (m.year) setYear(m.year);
        if (m.journal) setJournal(m.journal);
        if (m.publisher) setPublisher(m.publisher);
        if (m.volume) setVolume(m.volume);
        if (m.issue) setIssue(m.issue);
        if (m.pages) setPages(m.pages);
        if (m.doi) setDoi(m.doi);
        setShowAcademicFields(true);
        setDoiLookupStatus({
          type: 'success',
          message: `Tìm thấy: "${m.title || 'Tài liệu'}" (${m.year || 'N/A'}) qua CrossRef`,
        });
      } else {
        setDoiLookupStatus({
          type: 'error',
          message: res.error || 'Không tìm thấy thông tin DOI trên máy chủ CrossRef.',
        });
      }
    } catch (err: any) {
      setDoiLookupStatus({
        type: 'error',
        message: err.message || 'Lỗi mạng khi tra cứu DOI.',
      });
    } finally {
      setIsLookingUpDoi(false);
    }
  };

  const isPathOutsideRoot = Boolean(
    sourceMode === 'local' &&
    filePath.trim() &&
    canonicalLibraryRoot.trim() &&
    classifyPathRelativeToRoot(normalizeFilePath(filePath), canonicalLibraryRoot) === 'outside'
  );

  const detectTypeAndTitle = (fileName: string): { detectedType?: ResourceType; suggestedTitle: string } => {
    const cleanName = fileName.replace(/\.[^/.]+$/, '');
    const suggestedTitle = cleanName.replace(/[-_.]+/g, ' ').trim();
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    let detectedType: ResourceType | undefined;
    if (['.pdf'].includes(ext)) {
      detectedType = 'pdf';
    } else if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) {
      detectedType = 'audio';
    } else if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
      detectedType = 'video';
    } else if (['.epub', '.mobi', '.azw3', '.djvu', '.doc', '.docx'].includes(ext)) {
      detectedType = 'book';
    }

    return { detectedType, suggestedTitle };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFilePath(file.name);
    setFormError(null);
    const { detectedType, suggestedTitle } = detectTypeAndTitle(file.name);

    if (detectedType) {
      setType(detectedType);
    }

    if (!title.trim() && suggestedTitle) {
      setTitle(suggestedTitle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    let finalUrl: string | undefined;
    let finalPath: string | undefined;
    let finalOpenTarget: string | undefined = openTarget.trim() || undefined;

    if (sourceMode === 'web') {
      if (!url.trim() || url.trim() === 'https://') {
        setFormError('Vui lòng nhập đường dẫn liên kết (URL) hợp lệ.');
        return;
      }
      finalUrl = url.trim();
    } else {
      if (!filePath.trim() && !selectedFile) {
        setFormError('Vui lòng nhập đường dẫn tệp cục bộ hợp lệ.');
        return;
      }

      if (selectedFile) {
        setIsUploading(true);
        try {
          const ext = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
          let fileFormat: 'pdf' | 'epub' | 'md' = 'pdf';
          if (ext === '.epub') fileFormat = 'epub';
          else if (ext === '.md' || ext === '.markdown') fileFormat = 'md';
          else if (ext === '.pdf') fileFormat = 'pdf';
          else if (type === 'book') fileFormat = 'epub';
          else if (type === 'article') fileFormat = 'md';

          const uploadRes = await uploadArchiveFile({
            file: selectedFile,
            originalName: selectedFile.name,
            fileFormat,
            resourceId: initialResource?.id,
          });

          if (!uploadRes.success || !uploadRes.document?.id) {
            throw new Error('Upload không trả về ID tài liệu hợp lệ.');
          }

          finalOpenTarget = openTarget.trim() || `archive://${uploadRes.document.id}`;
          finalPath = uploadRes.document.storageRelPath || normalizeFilePath(filePath);
        } catch (uploadErr: any) {
          setIsUploading(false);
          setFormError(uploadErr.message || 'Lỗi khi tải tệp lên kho lưu trữ.');
          return;
        } finally {
          setIsUploading(false);
        }
      } else {
        finalPath = normalizeFilePath(filePath);
      }
    }

    const currentTopic = topics.find((t) => t.id === topicId);

    const academicData = {
      doi: doi.trim() || undefined,
      year: year.trim() || undefined,
      journal: journal.trim() || undefined,
      publisher: publisher.trim() || undefined,
      volume: volume.trim() || undefined,
      issue: issue.trim() || undefined,
      pages: pages.trim() || undefined,
      isbn: isbn.trim() || undefined,
    };

    const packedNotes = embedAcademicMetadataInNotes(notes.trim(), academicData);

    const resourcePayload = {
      topicId,
      topicTitle: currentTopic?.title || (initialResource ? initialResource.topicTitle : 'Chủ đề'),
      title: title.trim(),
      type,
      author: author.trim() || undefined,
      url: finalUrl,
      filePath: finalPath,
      openTarget: finalOpenTarget,
      notes: packedNotes || undefined,
      ...academicData,
    };

    if (initialResource) {
      updateResource(initialResource.id, resourcePayload);
    } else {
      addResource(resourcePayload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialResource ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu nghiên cứu'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title">
                {initialResource ? 'Chỉnh Sửa Tài Liệu' : 'Thêm Tài Liệu Nghiên Cứu'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Sách, Bài báo, PDF, Video, Audio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Quick DOI Lookup Bar */}
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-950 dark:text-amber-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Tra cứu nhanh bằng DOI (CrossRef Resolver)
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Tự động điền dữ liệu học thuật</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  data-testid="input-resource-doi"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="VD: 10.1038/nature12373 hoặc https://doi.org/..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/80 rounded-xl text-stone-900 dark:text-stone-100 text-xs font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                data-testid="btn-lookup-doi"
                onClick={handleLookupDoi}
                disabled={isLookingUpDoi}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
              >
                {isLookingUpDoi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <span>Tra cứu DOI</span>
                )}
              </button>
            </div>
            {doiLookupStatus && (
              <div
                data-testid="doi-lookup-status"
                className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                  doiLookupStatus.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {doiLookupStatus.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{doiLookupStatus.message}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Chủ đề liên kết *
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {topics.length === 0 ? (
                <option value="">-- Chưa có chủ đề (Hãy tạo chủ đề trước) --</option>
              ) : (
                topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.categoryName || t.type || 'Chủ đề'}] {t.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Định dạng tài liệu
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { type: 'pdf', label: 'PDF', icon: FileText },
                { type: 'book', label: 'Sách', icon: Book },
                { type: 'article', label: 'Bài viết', icon: Globe },
                { type: 'video', label: 'Video', icon: Video },
                { type: 'audio', label: 'Audio', icon: Headphones },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setType(item.type as ResourceType)}
                    className={`py-2 px-1 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      type === item.type
                        ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-bold'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Nguồn tài liệu *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceMode('web');
                  if (!url) setUrl('https://');
                  setFilePath('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sourceMode === 'web'
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-2xs font-bold'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Đường dẫn Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceMode('local');
                  setUrl('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sourceMode === 'local'
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-2xs font-bold'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Tệp trên máy</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Tiêu đề tài liệu *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giáo trình, sách tham khảo, tài liệu PDF hoặc báo cáo..."
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Tác giả / Dịch giả
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="VD: Tên tác giả, dịch giả hoặc tổ chức..."
                className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                {sourceMode === 'web' ? 'Liên kết tham chiếu (URL Web) *' : 'Đường dẫn tệp cục bộ (filePath) *'}
              </label>
              {sourceMode === 'web' ? (
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.epub,.mobi,.azw3,.doc,.docx,.mp4,.mkv,.avi,.mov,.webm,.mp3,.wav,.m4a,.aac,.ogg,.flac,.txt,.md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 flex items-center gap-1.5 transition shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Duyệt tệp trên máy</span>
                    </button>
                    <input
                      type="text"
                      value={filePath}
                      onChange={(e) => {
                        setFilePath(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Đường dẫn tệp (/Users/.../KinhDien.pdf hoặc D:\...)..."
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                    />
                  </div>

                  {isPathOutsideRoot && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Cảnh báo sao lưu: </span>
                        <span>
                          Tệp này nằm ngoài thư mục thư viện gốc (<code className="font-mono">{canonicalLibraryRoot}</code>). Khi sao lưu thư viện, tệp này có thể bị bỏ sót nếu không được gom vào thư mục chuẩn.
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight">
                    * Trình duyệt bảo mật không đọc được đường dẫn tuyệt đối (C:\ hoặc /Users/...). Đã tự động điền tên tệp; bạn có thể chỉnh sửa hoặc thêm tiền tố thư mục nếu cần.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Academic Publishing Metadata Section */}
          <div className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden bg-stone-50/50 dark:bg-stone-800/30">
            <button
              type="button"
              onClick={() => setShowAcademicFields(!showAcademicFields)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-stone-100/60 dark:hover:bg-stone-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Thông tin xuất bản & Trích dẫn học thuật (Tuỳ chọn)
                </span>
                {(year || journal || publisher) && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-medium">
                    Đã nhập
                  </span>
                )}
              </div>
              {showAcademicFields ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </button>

            {showAcademicFields && (
              <div className="p-4 pt-1 border-t border-stone-200/60 dark:border-stone-700/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Năm xuất bản
                    </label>
                    <input
                      type="text"
                      data-testid="input-resource-year"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="VD: 2023"
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Tạp chí / Tuyển tập / Hội thảo
                    </label>
                    <input
                      type="text"
                      data-testid="input-resource-journal"
                      value={journal}
                      onChange={(e) => setJournal(e.target.value)}
                      placeholder="VD: Nature Communications hoặc Tạp chí Nghiên cứu Phật học"
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Nhà xuất bản
                    </label>
                    <input
                      type="text"
                      data-testid="input-resource-publisher"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      placeholder="VD: Oxford University Press, NXB Tôn Giáo..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Mã ISBN
                    </label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="VD: 978-0-123456-47-2"
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Tập (Volume)
                    </label>
                    <input
                      type="text"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="VD: 14"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Số (Issue)
                    </label>
                    <input
                      type="text"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="VD: 2"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Trang (Pages)
                    </label>
                    <input
                      type="text"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      placeholder="VD: 120-145"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Open Target Custom Override Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center justify-between">
              <span>Đích mở nội dung (openTarget - tùy chọn)</span>
              <span className="text-[10px] lowercase text-stone-400 dark:text-stone-500 font-normal">ưu tiên khi bấm "Mở tài liệu"</span>
            </label>
            <input
              type="text"
              value={openTarget}
              onChange={(e) => setOpenTarget(e.target.value)}
              placeholder="VD: drive.google.com/... hoặc obsidian://... (để trống sẽ tự động dùng liên kết trên)"
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 leading-tight">
              * Đích mở trực tiếp khi bấm nút "Mở Tài Liệu". Nếu để trống, hệ thống sẽ tự động fallback sang Liên kết tham chiếu hoặc Tệp cục bộ.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Ghi chú thêm về tài liệu
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tóm lược trọng điểm hoặc chương tham khảo quan trọng..."
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-xs transition flex items-center gap-2"
            >
              {isUploading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{isUploading ? 'Đang tải lên...' : (initialResource ? 'Lưu Tài Liệu' : 'Thêm Tài Liệu')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
