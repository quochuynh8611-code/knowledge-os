import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeToggle } from '../../src/components/common/ThemeToggle';
import { Breadcrumbs } from '../../src/components/common/Breadcrumbs';
import { LoadingSkeleton } from '../../src/components/common/LoadingSkeleton';
import { TopicSkeleton } from '../../src/components/common/TopicSkeleton';
import { NoteSkeleton } from '../../src/components/common/NoteSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Sparkles, BookOpen } from 'lucide-react';

describe('Phase 1A Components & Hooks Testing', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  describe('useTheme Hook & ThemeToggle Component', () => {
    it('Mặc định khởi tạo theme và cập nhật class dark trên documentElement khi chuyển theme', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBeDefined();

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('ThemeToggle render ở chế độ button và phản hồi sự kiện click', () => {
      render(<ThemeToggle variant="button" showLabel />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('ThemeToggle render ở chế độ segmented với 3 options', () => {
      render(<ThemeToggle variant="segmented" showLabel />);
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();

      const darkOption = screen.getByRole('radio', { name: /Tối \(Mực nho\)/i });
      fireEvent.click(darkOption);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Breadcrumbs Component', () => {
    it('Render danh sách breadcrumb items đúng thứ tự và có phân cách', () => {
      const handleHomeClick = vi.fn();
      const handleCatClick = vi.fn();

      const items = [
        { label: 'Tam Tạng', onClick: handleCatClick },
        { label: 'Abhidharma', isCurrent: false },
        { label: '89 Tâm', isCurrent: true },
      ];

      render(<Breadcrumbs items={items} onHomeClick={handleHomeClick} />);

      expect(screen.getByText('Tổng quan')).toBeInTheDocument();
      expect(screen.getByText('Tam Tạng')).toBeInTheDocument();
      expect(screen.getByText('Abhidharma')).toBeInTheDocument();
      expect(screen.getByText('89 Tâm')).toBeInTheDocument();

      // Click home
      fireEvent.click(screen.getByTitle('Về Trang Tổng Quan'));
      expect(handleHomeClick).toHaveBeenCalledTimes(1);

      // Click category
      fireEvent.click(screen.getByText('Tam Tạng'));
      expect(handleCatClick).toHaveBeenCalledTimes(1);

      // Current page has aria-current
      const currentItem = screen.getByText('89 Tâm').closest('[aria-current]');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    it('Trả về null nếu items rỗng', () => {
      const { container } = render(<Breadcrumbs items={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('LoadingSkeleton, TopicSkeleton & NoteSkeleton', () => {
    it('LoadingSkeleton render đúng số lượng và variant', () => {
      const { container } = render(<LoadingSkeleton variant="circle" width="32px" height="32px" />);
      const skeleton = container.querySelector('.rounded-full');
      expect(skeleton).toBeInTheDocument();
    });

    it('TopicSkeleton render đúng ở cả 3 chế độ card, detail, tree', () => {
      const { container: cardContainer } = render(<TopicSkeleton mode="card" count={2} />);
      expect(cardContainer.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

      const { container: detailContainer } = render(<TopicSkeleton mode="detail" />);
      expect(detailContainer.querySelector('.max-w-5xl')).toBeInTheDocument();

      const { container: treeContainer } = render(<TopicSkeleton mode="tree" count={3} />);
      expect(treeContainer.querySelectorAll('.rounded-full').length).toBe(3);
    });

    it('NoteSkeleton render lưới thẻ ghi chú khung xương', () => {
      const { container } = render(<NoteSkeleton count={4} />);
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });
  });

  describe('EmptyState Component', () => {
    it('Render đầy đủ tiêu đề, mô tả, nút CTA chính và nút phụ', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();
      const handleSuggestion = vi.fn();

      render(
        <EmptyState
          icon={Sparkles}
          title="Chưa có chủ đề nào"
          description="Hãy tạo chủ đề khảo cứu đầu tiên của bạn"
          primaryAction={{
            label: 'Thêm Chủ Đề Mới',
            onClick: handlePrimary,
          }}
          secondaryAction={{
            label: 'Xem Hướng Dẫn',
            onClick: handleSecondary,
          }}
          suggestions={[
            { label: 'Abhidharma', onClick: handleSuggestion },
          ]}
        />
      );

      expect(screen.getByText('Chưa có chủ đề nào')).toBeInTheDocument();
      expect(screen.getByText('Hãy tạo chủ đề khảo cứu đầu tiên của bạn')).toBeInTheDocument();

      const primaryBtn = screen.getByText('Thêm Chủ Đề Mới');
      fireEvent.click(primaryBtn);
      expect(handlePrimary).toHaveBeenCalledTimes(1);

      const secondaryBtn = screen.getByText('Xem Hướng Dẫn');
      fireEvent.click(secondaryBtn);
      expect(handleSecondary).toHaveBeenCalledTimes(1);

      const suggestionBtn = screen.getByText('#Abhidharma');
      fireEvent.click(suggestionBtn);
      expect(handleSuggestion).toHaveBeenCalledTimes(1);
    });
  });
});
