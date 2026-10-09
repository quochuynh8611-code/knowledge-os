/**
 * UI Integration Test Suite: Mind Map Persistence Modals & Workflow (Phase P1)
 *
 * Verifies:
 * 1. MindMapSaveModal validation, submission, version mode, and volatile warning.
 * 2. MindMapDocumentBrowserModal rendering, search filtering, open, rename, archive actions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MindMapSaveModal } from '../../src/components/mindmap/MindMapSaveModal';
import { MindMapDocumentBrowserModal } from '../../src/components/mindmap/MindMapDocumentBrowserModal';
import { MindMapDocumentSummary } from '../../src/types/mindmapDocument';

describe('Mind Map Persistence UI Modals (Phase P1)', () => {
  const SAMPLE_DOCS: MindMapDocumentSummary[] = [
    {
      id: 'doc-tu-dieu-de',
      title: 'Tứ Diệu Đế Chuẩn',
      description: 'Khảo cứu 4 chân lý',
      tags: ['phat-hoc'],
      currentVersionNumber: 2,
      totalVersionsCount: 2,
      isArchived: false,
      createdAt: '2026-10-09T00:00:00.000Z',
      updatedAt: '2026-10-09T01:00:00.000Z',
    },
    {
      id: 'doc-bat-chanh-dao',
      title: 'Bát Chánh Đạo Toàn Diện',
      tags: ['dao-de'],
      currentVersionNumber: 1,
      totalVersionsCount: 1,
      isArchived: false,
      createdAt: '2026-10-09T00:00:00.000Z',
      updatedAt: '2026-10-09T00:30:00.000Z',
    },
  ];

  // ==========================================
  // 1. SAVE MODAL TESTS
  // ==========================================
  describe('MindMapSaveModal', () => {
    it('renders save new document form with prefilled default title', () => {
      render(
        <MindMapSaveModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveNew={vi.fn()}
          defaultTitle="Sơ đồ Khởi tạo"
          nodesCount={12}
          layoutMode="tree_horizontal"
        />
      );

      expect(screen.getByTestId('mindmap-save-modal')).toBeInTheDocument();
      expect(screen.getByText('Lưu Sơ Đồ Tư Duy Mới')).toBeInTheDocument();
      const titleInput = screen.getByTestId('input-doc-title') as HTMLInputElement;
      expect(titleInput.value).toBe('Sơ đồ Khởi tạo');
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Ngang')).toBeInTheDocument();
    });

    it('rejects empty title and shows validation error message', () => {
      const onSaveNew = vi.fn();
      render(
        <MindMapSaveModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveNew={onSaveNew}
          defaultTitle=""
          nodesCount={5}
          layoutMode="tree_horizontal"
        />
      );

      const form = screen.getByTestId('btn-confirm-save-doc').closest('form')!;
      fireEvent.submit(form);
      expect(screen.getByText('Tiêu đề sơ đồ không được để trống.')).toBeInTheDocument();
      expect(onSaveNew).not.toHaveBeenCalled();
    });

    it('submits valid new document data', () => {
      const onSaveNew = vi.fn();
      render(
        <MindMapSaveModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveNew={onSaveNew}
          defaultTitle="Sơ đồ Ngũ Uẩn"
          nodesCount={5}
          layoutMode="tree_vertical"
        />
      );

      fireEvent.change(screen.getByTestId('input-doc-description'), {
        target: { value: 'Mô tả chi tiết 5 uẩn' },
      });
      fireEvent.change(screen.getByTestId('input-change-summary'), {
        target: { value: 'Bản thảo ban đầu' },
      });

      fireEvent.click(screen.getByTestId('btn-confirm-save-doc'));

      expect(onSaveNew).toHaveBeenCalledWith('Sơ đồ Ngũ Uẩn', 'Mô tả chi tiết 5 uẩn', 'Bản thảo ban đầu');
    });

    it('displays volatile memory warning banner when isVolatile is true', () => {
      render(
        <MindMapSaveModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveNew={vi.fn()}
          defaultTitle="Sơ đồ RAM"
          isVolatile={true}
          nodesCount={3}
          layoutMode="tree_horizontal"
        />
      );

      expect(screen.getByTestId('save-modal-volatile-warning')).toBeInTheDocument();
      expect(screen.getByText(/Bộ nhớ tạm thời \(RAM\)/)).toBeInTheDocument();
    });

    it('renders save version mode when activeDocument is provided', () => {
      const onSaveVersion = vi.fn();
      render(
        <MindMapSaveModal
          isOpen={true}
          onClose={vi.fn()}
          onSaveNew={vi.fn()}
          onSaveVersion={onSaveVersion}
          activeDocument={SAMPLE_DOCS[0]}
          nodesCount={15}
          layoutMode="tree_horizontal"
        />
      );

      expect(screen.getByText('Lưu Phiên Bản Mới (v3)')).toBeInTheDocument();
      expect(screen.queryByTestId('input-doc-title')).not.toBeInTheDocument();

      fireEvent.change(screen.getByTestId('input-change-summary'), {
        target: { value: 'Thêm nhánh Đạo Đế' },
      });
      fireEvent.click(screen.getByTestId('btn-confirm-save-doc'));

      expect(onSaveVersion).toHaveBeenCalledWith('Thêm nhánh Đạo Đế');
    });
  });

  // ==========================================
  // 2. DOCUMENT BROWSER MODAL TESTS
  // ==========================================
  describe('MindMapDocumentBrowserModal', () => {
    it('renders saved document cards with titles, versions and active indicator', () => {
      render(
        <MindMapDocumentBrowserModal
          isOpen={true}
          onClose={vi.fn()}
          documents={SAMPLE_DOCS}
          activeDocumentId="doc-tu-dieu-de"
          onOpenDocument={vi.fn()}
          onRenameDocument={vi.fn()}
          onArchiveDocument={vi.fn()}
        />
      );

      expect(screen.getByTestId('mindmap-browser-modal')).toBeInTheDocument();
      expect(screen.getByText('Tứ Diệu Đế Chuẩn')).toBeInTheDocument();
      expect(screen.getByText('Bát Chánh Đạo Toàn Diện')).toBeInTheDocument();
      expect(screen.getByText('Đang mở')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });

    it('filters documents dynamically via search input', () => {
      render(
        <MindMapDocumentBrowserModal
          isOpen={true}
          onClose={vi.fn()}
          documents={SAMPLE_DOCS}
          onOpenDocument={vi.fn()}
          onRenameDocument={vi.fn()}
          onArchiveDocument={vi.fn()}
        />
      );

      const searchInput = screen.getByTestId('input-search-saved-docs');
      fireEvent.change(searchInput, { target: { value: 'Bát Chánh' } });

      expect(screen.queryByText('Tứ Diệu Đế Chuẩn')).not.toBeInTheDocument();
      expect(screen.getByText('Bát Chánh Đạo Toàn Diện')).toBeInTheDocument();
    });

    it('triggers onOpenDocument when clicking a document card', () => {
      const onOpen = vi.fn();
      render(
        <MindMapDocumentBrowserModal
          isOpen={true}
          onClose={vi.fn()}
          documents={SAMPLE_DOCS}
          onOpenDocument={onOpen}
          onRenameDocument={vi.fn()}
          onArchiveDocument={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('doc-card-doc-bat-chanh-dao'));
      expect(onOpen).toHaveBeenCalledWith('doc-bat-chanh-dao');
    });

    it('allows inline renaming and triggers onRenameDocument', () => {
      const onRename = vi.fn();
      render(
        <MindMapDocumentBrowserModal
          isOpen={true}
          onClose={vi.fn()}
          documents={SAMPLE_DOCS}
          onOpenDocument={vi.fn()}
          onRenameDocument={onRename}
          onArchiveDocument={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('btn-rename-doc-tu-dieu-de'));
      const renameInput = screen.getByTestId('input-rename-doc-tu-dieu-de');
      fireEvent.change(renameInput, { target: { value: 'Tứ Diệu Đế Bản Mới' } });
      fireEvent.click(screen.getByTestId('btn-save-rename-doc-tu-dieu-de'));

      expect(onRename).toHaveBeenCalledWith('doc-tu-dieu-de', 'Tứ Diệu Đế Bản Mới');
    });

    it('triggers onArchiveDocument when clicking archive icon', () => {
      const onArchive = vi.fn();
      render(
        <MindMapDocumentBrowserModal
          isOpen={true}
          onClose={vi.fn()}
          documents={SAMPLE_DOCS}
          onOpenDocument={vi.fn()}
          onRenameDocument={vi.fn()}
          onArchiveDocument={onArchive}
        />
      );

      fireEvent.click(screen.getByTestId('btn-archive-doc-tu-dieu-de'));
      expect(onArchive).toHaveBeenCalledWith('doc-tu-dieu-de');
    });
  });
});
