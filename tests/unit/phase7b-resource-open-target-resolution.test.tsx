import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resolveResourceOpenTarget, getResourceOpenState } from '../../src/lib/resourceOpenResolver';
import { ResourceViewerModal } from '../../src/components/modals/ResourceViewerModal';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { DataProvider } from '../../src/context/DataContext';
import { Resource } from '../../src/types';
import { ResourceSchema, ResourceCreateSchema } from '../../src/lib/validation';

describe('Phase 7B: Resource Open Target Resolution & Model/Form/Viewer UX Upgrade', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. resolveResourceOpenTarget Target Classification & Fallback Rules', () => {
    it('1.1. openTarget là HTTPS URL hợp lệ -> targetType = web_url, canOpenDirectly = true', () => {
      const res: Resource = {
        id: 'res-1',
        topicId: 'topic-1',
        title: 'Tài liệu A',
        type: 'pdf',
        openTarget: 'https://drive.google.com/file/d/123/view',
        url: 'https://reference-site.org/book',
        filePath: '/Users/researcher/Books/kosa.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('web_url');
      expect(result.targetUrl).toBe('https://drive.google.com/file/d/123/view');
      expect(result.canOpenDirectly).toBe(true);
      expect(result.sourceField).toBe('openTarget');
      expect(result.label).toContain('Đích mở nội dung');
    });

    it('1.2. openTarget là custom scheme Obsidian URL -> targetType = custom_scheme, canOpenDirectly = true', () => {
      const res: Resource = {
        id: 'res-custom-scheme',
        topicId: 'topic-1',
        title: 'Obsidian Note Link',
        type: 'article',
        openTarget: 'obsidian://open?vault=Research&file=Abhidharma',
        url: 'https://suttacentral.net/dn22',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('custom_scheme');
      expect(result.targetUrl).toBe('obsidian://open?vault=Research&file=Abhidharma');
      expect(result.canOpenDirectly).toBe(true);
      expect(result.sourceField).toBe('openTarget');
      expect(result.label).toContain('Ứng dụng');
    });

    it('1.3. openTarget là file protocol hoặc local path -> targetType = local_path, canOpenDirectly = false', () => {
      const res: Resource = {
        id: 'res-file-proto',
        topicId: 'topic-1',
        title: 'Tài liệu file protocol',
        type: 'pdf',
        openTarget: 'file:///Users/researcher/Library/doc.pdf',
        url: 'https://reference.org/doc.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('local_path');
      expect(result.targetUrl).toBe('file:///Users/researcher/Library/doc.pdf');
      expect(result.canOpenDirectly).toBe(false);
      expect(result.sourceField).toBe('openTarget');
      expect(result.label).toContain('Tệp cục bộ');
    });

    it('1.4. Fallback từ openTarget rỗng sang url tham chiếu hợp lệ -> targetType = web_url, canOpenDirectly = true', () => {
      const res: Resource = {
        id: 'res-2',
        topicId: 'topic-1',
        title: 'Tài liệu B',
        type: 'article',
        url: 'https://suttacentral.net/dn22',
        filePath: '/Users/researcher/Books/dn22.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('web_url');
      expect(result.targetUrl).toBe('https://suttacentral.net/dn22');
      expect(result.canOpenDirectly).toBe(true);
      expect(result.sourceField).toBe('url');
      expect(result.label).toContain('Liên kết tham chiếu');
    });

    it('1.5. Chỉ có filePath cục bộ -> targetType = local_path, canOpenDirectly = false', () => {
      const res: Resource = {
        id: 'res-3',
        topicId: 'topic-1',
        title: 'Tài liệu C',
        type: 'book',
        filePath: '/Users/researcher/Books/KyMon.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('local_path');
      expect(result.targetUrl).toBe('/Users/researcher/Books/KyMon.pdf');
      expect(result.canOpenDirectly).toBe(false);
      expect(result.sourceField).toBe('filePath');
      expect(result.label).toContain('Tệp cục bộ');
    });

    it('1.6. Resource không có bất kỳ nguồn nào -> targetType = none, canOpenDirectly = false', () => {
      const res: Resource = {
        id: 'res-4',
        topicId: 'topic-1',
        title: 'Tài liệu D',
        type: 'book',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('none');
      expect(result.canOpenDirectly).toBe(false);
      expect(result.targetUrl).toBeUndefined();
    });

    it('1.7. openTarget là chuỗi không an toàn (javascript:...) -> targetType = unsupported_target, canOpenDirectly = false', () => {
      const res: Resource = {
        id: 'res-unsafe',
        topicId: 'topic-1',
        title: 'Tài liệu không an toàn',
        type: 'article',
        openTarget: 'javascript:alert(1)',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = resolveResourceOpenTarget(res);
      expect(result.targetType).toBe('unsupported_target');
      expect(result.canOpenDirectly).toBe(false);
      expect(result.label).toContain('Không hỗ trợ');
    });
  });

  describe('2. ResourceViewerModal Component UX & Truthful Affordances', () => {
    it('2.1. Render nút mở trực tiếp khi canOpenDirectly = true (openTarget)', () => {
      const res: Resource = {
        id: 'res-viewer-1',
        topicId: 'topic-1',
        title: 'Khảo Cứu Vi Diệu Pháp',
        type: 'pdf',
        openTarget: 'https://custom-reader.org/doc/456',
        url: 'https://catalog.org/item/456',
        filePath: '/Users/researcher/Books/abhidhamma.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      render(<ResourceViewerModal resource={res} onClose={vi.fn()} />);

      // Verify Open Direct button links to openTarget
      const openLink = screen.getByRole('link', { name: /Mở Tài Liệu Trực Tiếp|Mở Trong Ứng Dụng/i });
      expect(openLink).toHaveAttribute('href', 'https://custom-reader.org/doc/456');

      // Verify all 3 paths/links are displayed with clear labels
      expect(screen.getByText(/custom-reader\.org/i)).toBeInTheDocument();
      expect(screen.getByText(/catalog\.org/i)).toBeInTheDocument();
      expect(screen.getByText(/abhidhamma\.pdf/i)).toBeInTheDocument();
    });

    it('2.2. Khi chỉ có filePath (canOpenDirectly = false), KHÔNG render link mù, giải thích rõ ràng và có nút sao chép đường dẫn', () => {
      const res: Resource = {
        id: 'res-viewer-2',
        topicId: 'topic-1',
        title: 'Kỳ Môn Độn Giáp Cổ Bản',
        type: 'book',
        filePath: '/Users/researcher/Books/kymon.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      render(<ResourceViewerModal resource={res} onClose={vi.fn()} />);

      // Should NOT render a clickable external link to nowhere
      expect(screen.queryByRole('link', { name: /Mở Tài Liệu Trực Tiếp/i })).toBeNull();

      // Should render informative message about local file
      expect(screen.getByText(/Tài liệu cục bộ trên máy/i)).toBeInTheDocument();

      // Should have copy path button
      const copyBtns = screen.getAllByRole('button', { name: /Sao chép đường dẫn/i });
      expect(copyBtns.length).toBeGreaterThan(0);
    });

    it('2.3. Khi openTarget là unsupported_target, hiển thị cảnh báo trung thực và không render nút mở trực tiếp', () => {
      const res: Resource = {
        id: 'res-viewer-3',
        topicId: 'topic-1',
        title: 'Tài liệu đích mở không hợp lệ',
        type: 'article',
        openTarget: 'javascript:void(0)',
        createdAt: '2026-08-01T00:00:00Z',
      };

      render(<ResourceViewerModal resource={res} onClose={vi.fn()} />);

      expect(screen.queryByRole('link', { name: /Mở Tài Liệu Trực Tiếp/i })).toBeNull();
      expect(screen.getByText(/Đích mở không được hỗ trợ/i)).toBeInTheDocument();
    });
  });

  describe('3. ResourceFormModal & Editing Capabilities', () => {
    it('3.1. Hiển thị trường openTarget và các nhãn mới rõ nghĩa', () => {
      render(
        <DataProvider>
          <ResourceFormModal isOpen={true} onClose={vi.fn()} />
        </DataProvider>
      );

      // Verify upgraded labels
      expect(screen.getAllByText(/Liên kết tham chiếu/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Đích mở nội dung/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/drive\.google\.com|obsidian:\/\//i)).toBeInTheDocument();
    });

    it('3.2. Chỉnh sửa resource cũ không có openTarget bảo toàn đầy đủ các trường', () => {
      const oldResource: Resource = {
        id: 'res-old-1',
        topicId: 'topic-1',
        topicTitle: 'Phật Học Cơ Bản',
        title: 'Kinh Pháp Cú',
        type: 'book',
        author: 'Phật Thích Ca',
        url: 'https://suttacentral.net/dhp',
        notes: 'Ghi chú quan trọng',
        createdAt: '2026-08-01T00:00:00Z',
      };

      render(
        <DataProvider>
          <ResourceFormModal isOpen={true} onClose={vi.fn()} initialResource={oldResource} />
        </DataProvider>
      );

      expect(screen.getByDisplayValue('Kinh Pháp Cú')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://suttacentral.net/dhp')).toBeInTheDocument();
    });
  });

  describe('4. Schema Validation & Backward Compatibility', () => {
    it('4.1. ResourceSchema chấp nhận openTarget và giữ vững tính tương thích', () => {
      const resWithOpenTarget = {
        id: 'res-schema-1',
        topicId: 'topic-1',
        title: 'Tài liệu kiểm tra Schema',
        type: 'pdf' as const,
        openTarget: 'https://reader.app/doc1',
        url: 'https://source.app/doc1',
        filePath: '/data/doc1.pdf',
        createdAt: '2026-08-01T00:00:00Z',
      };

      const result = ResourceSchema.safeParse(resWithOpenTarget);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openTarget).toBe('https://reader.app/doc1');
      }
    });

    it('4.2. ResourceCreateSchema chấp nhận khi chỉ có openTarget', () => {
      const input = {
        topicId: 'topic-1',
        title: 'Tài liệu chỉ có openTarget',
        type: 'article' as const,
        openTarget: 'https://viewer.org/item1',
      };

      const result = ResourceCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
