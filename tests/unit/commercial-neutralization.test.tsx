import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { AdvancedSearch } from '../../src/components/search/AdvancedSearch';
import { KnowledgeGraph } from '../../src/components/graph/KnowledgeGraph';
import { TopicFormModal } from '../../src/components/modals/TopicFormModal';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import { Navbar } from '../../src/components/layout/Navbar';
import { DataProvider } from '../../src/context/DataContext';

describe('Commercial Neutralization & Zero-Default Baseline Contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Zero-default research domain baseline in initialData', () => {
    it('1.1. INITIAL_CATEGORIES contains zero default specialized domains', () => {
      expect(INITIAL_CATEGORIES.length).toBe(0);
    });

    it('1.2. INITIAL_TOPICS contains zero default specialized topics', () => {
      expect(INITIAL_TOPICS.length).toBe(0);
    });
  });

  describe('2. Input Placeholders Neutrality', () => {
    it('2.1. AdvancedSearch placeholder does not contain specialized terms (Vi Diệu Pháp, Tâm Vương, Cửu Cung, Quẻ Càn, Bát Nhã, Tứ Niệm Xứ)', () => {
      render(
        <DataProvider>
          <AdvancedSearch />
        </DataProvider>
      );
      const searchInput = screen.getByRole('textbox');
      const placeholder = searchInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('Vi Diệu Pháp');
      expect(placeholder).not.toContain('Tâm Vương');
      expect(placeholder).not.toContain('Cửu Cung');
      expect(placeholder).not.toContain('Quẻ Càn');
      expect(placeholder).not.toContain('Bát Nhã');
      expect(placeholder).not.toContain('Tứ Niệm Xứ');
      expect(placeholder.toLowerCase()).toContain('thuật ngữ');
    });

    it('2.2. TopicFormModal placeholder does not contain Dhammasangani, Bộ Pháp Tụ, or Kỳ Môn Độn Giáp', () => {
      render(
        <DataProvider>
          <TopicFormModal isOpen={true} onClose={() => {}} />
        </DataProvider>
      );
      const titleInput = screen.getByLabelText(/tiêu đề chủ đề/i);
      const placeholder = titleInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('Bộ Pháp Tụ');
      expect(placeholder).not.toContain('Dhammasangani');
      expect(placeholder).not.toContain('Kỳ Môn Độn Giáp');
    });

    it('2.3. NoteFormModal placeholder does not contain Danh Sắc trong tâm', () => {
      render(
        <DataProvider>
          <NoteFormModal isOpen={true} onClose={() => {}} />
        </DataProvider>
      );
      const titleInput = screen.getByPlaceholderText(/VD:/i);
      const placeholder = titleInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('Danh Sắc trong tâm');
    });

    it('2.4. ResourceFormModal placeholders do not contain Thắng Pháp Tập Yếu Luận, Bát Môn Trận Đồ, HT. Thích Minh Châu', () => {
      render(
        <DataProvider>
          <ResourceFormModal isOpen={true} onClose={() => {}} />
        </DataProvider>
      );
      const titleInput = screen.getByPlaceholderText(/VD:.*PDF/i);
      const placeholder = titleInput.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('Thắng Pháp Tập Yếu Luận');
      expect(placeholder).not.toContain('Bát Môn Trận Đồ');

      expect(screen.queryByPlaceholderText(/HT\..*Minh Châu/i)).toBeNull();
      const authorInput = screen.getByPlaceholderText(/VD:.*tác giả/i);
      expect(authorInput).toBeInTheDocument();
      expect(authorInput.getAttribute('placeholder')).not.toContain('Thích Minh Châu');
    });

    it('2.5. AIResearchStudio input fallback placeholder does not contain Phật học & Dịch học', () => {
      render(
        <DataProvider>
          <AIResearchStudio />
        </DataProvider>
      );
      const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
      const placeholder = input.getAttribute('placeholder') || '';
      expect(placeholder).not.toContain('Phật học & Dịch học');
    });
  });

  describe('3. Header & Presentation Neutrality', () => {
    it('3.1. KnowledgeGraph subtitle does not hardcode Vi Diệu Pháp, Thiền định, Kỳ Môn, Thái Ất, Kinh Dịch', () => {
      render(
        <DataProvider>
          <KnowledgeGraph />
        </DataProvider>
      );
      expect(screen.queryByText(/Trực quan hóa mạng lưới liên kết giữa Vi Diệu Pháp, Thiền định, Kỳ Môn, Thái Ất, Kinh Dịch/i)).toBeNull();
    });

    it('3.2. KnowledgeGraph does not render hardcoded fallback buttons for Phật Học and Huyền Học when categories are empty', () => {
      render(
        <DataProvider>
          <KnowledgeGraph />
        </DataProvider>
      );
      expect(screen.queryByRole('button', { name: /Phật Học/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Huyền Học/i })).toBeNull();
    });
  });
});
