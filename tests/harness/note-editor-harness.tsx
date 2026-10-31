import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { DataContext } from '../../src/context/DataContext';
import type { Note, NoteCitationProvenance } from '../../src/types';

export type HarnessScenario = 'default' | 'long-fixture' | 'empty-topics';

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Triết Học',
    slug: 'triet-hoc',
    description: 'Nghiên cứu triết học',
    color: '#8b5cf6',
  },
  {
    id: 'cat-2',
    name: 'Khoa Học Máy Tính',
    slug: 'khoa-hoc-may-tinh',
    description: 'Khoa học máy tính',
    color: '#3b82f6',
  },
];

const mockTopics = [
  {
    id: 'topic-1',
    categoryId: 'cat-1',
    title: 'Hiện Tượng Học & Nhận Thức Luận',
    description: 'Các nguyên lý cơ bản',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'topic-2',
    categoryId: 'cat-2',
    title: 'Hệ Thống Phân Tán',
    description: 'Kiến trúc hệ thống',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockLongProvenance: NoteCitationProvenance = {
  documentId: 'doc-long-001',
  documentTitle:
    'Nghiên Cứu Chuyên Sâu Về Hiện Tượng Học Nhận Thức Luận Lịch Sử Và Cấu Trúc Ý Thức Trong Triết Học Đương Đại Thế Kỷ XX - Tập II (Bản Dịch Học Thuật Đầy Đủ)',
  format: 'pdf',
  locator: 'Chương 14, Mục 3.2, Trang 412–419',
  excerptText: 'Ý thức luôn là ý thức về một đối tượng nhất định trong dòng thời gian nội tại.',
};

const mockLongNote: Note = {
  id: 'note-long-001',
  topicId: 'topic-1',
  title:
    'Phân tích cấu trúc thời gian nội tại, tính chủ thể liên đới và sự hình thành khái niệm trong các bản thảo nghiên cứu hiện tượng học giai đoạn 1905–1935 của Edmund Husserl',
  content: Array.from(
    { length: 30 },
    (_, i) =>
      `Đoạn ${i + 1}: Trong cấu trúc của ý thức thời gian nội tại, mỗi ấn tượng nguyên thủy (Urimpression) luôn đi kèm với sự lưu giữ (Retention) của khoảnh khắc vừa qua và sự dự phóng (Protention) hướng tới khoảnh khắc sắp tới [[Hiện Tượng Học & Nhận Thức Luận]].`
  ).join('\n\n'),
  type: 'study',
  sourcePath:
    '/Users/researcher/Knowledge-Library/Notes/2026/Academic-Archive/Phenomenology-Epistemology-Long-Subdirectory-Path/husserl-time-consciousness-manuscript-analysis-v3-final.md',
  tags: [
    'hien-tuong-hoc',
    'nhan-thuc-luan',
    'y-thuc-thoi-gian',
    'chu-the-lien-doi',
    'phuong-phap-luan',
    'phan-tich-khai-niem',
    'ban-thao-1905',
    'nghien-cuu-co-ban',
    'trich-dan-nguon',
    'tong-hop-tai-lieu',
  ],
  isPrivate: false,
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-01-15T09:30:00Z',
};

function getInitialScenario(): HarnessScenario {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('scenario');
  if (scenario === 'long-fixture' || scenario === 'empty-topics') {
    return scenario;
  }
  return 'default';
}

function HarnessApp() {
  const [scenario, setScenario] = useState<HarnessScenario>(getInitialScenario);
  const [isOpen, setIsOpen] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);

  const activeTopics = scenario === 'empty-topics' ? [] : mockTopics;
  const activeInitialNote = scenario === 'long-fixture' ? mockLongNote : null;
  const activeProvenance = scenario === 'long-fixture' ? mockLongProvenance : undefined;
  const activeDefaultTopicId = scenario === 'empty-topics' ? '' : 'topic-1';

  const mockContextValue: any = {
    categories: mockCategories,
    topics: activeTopics,
    addNote: (note: any) => {
      setNotes((prev) => [...prev, { ...note, id: `note-${Date.now()}` }]);
      setIsOpen(false);
    },
    updateNote: (id: string, updates: any) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
      setIsOpen(false);
    },
  };

  return (
    <DataContext.Provider value={mockContextValue}>
      <div className="p-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          data-testid="reopen-modal-button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-stone-800 text-white rounded text-sm"
        >
          Mở lại Modal
        </button>
        <button
          type="button"
          data-testid="scenario-default-button"
          onClick={() => {
            setScenario('default');
            setIsOpen(true);
          }}
          className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded text-xs"
        >
          Scenario: Default
        </button>
        <button
          type="button"
          data-testid="scenario-long-button"
          onClick={() => {
            setScenario('long-fixture');
            setIsOpen(true);
          }}
          className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded text-xs"
        >
          Scenario: Long Fixture
        </button>
        <button
          type="button"
          data-testid="scenario-empty-topics-button"
          onClick={() => {
            setScenario('empty-topics');
            setIsOpen(true);
          }}
          className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded text-xs"
        >
          Scenario: Empty Topics
        </button>
        {isOpen && (
          <NoteFormModal
            key={scenario}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            initialNote={activeInitialNote}
            initialProvenance={activeProvenance}
            defaultTopicId={activeDefaultTopicId}
          />
        )}
      </div>
    </DataContext.Provider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<HarnessApp />);
}
