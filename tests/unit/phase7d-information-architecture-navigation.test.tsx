import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataProvider, useData, ActiveTab } from '../../src/context/DataContext';
import { Sidebar } from '../../src/components/layout/Sidebar';
import App from '../../src/App';

function SidebarWithActiveTab({ tab }: { tab: ActiveTab }) {
  const { setActiveTab } = useData();
  React.useEffect(() => {
    setActiveTab(tab);
  }, [tab, setActiveTab]);
  return <Sidebar />;
}

describe('Phase 7D: Information Architecture & Navigation Refactoring', () => {
  describe('1. Main Level-1 Navigation (Danh mục chính)', () => {
    it('1.1. Khối "Danh mục chính" chỉ chứa 8 luồng công việc nghiên cứu phổ quát', () => {
      const { container } = render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Locate the "Danh mục chính" section container
      const heading = screen.getByText(/^Danh mục chính$/i);
      expect(heading).toBeInTheDocument();
      const mainNavSection = heading.parentElement;
      expect(mainNavSection).toBeDefined();

      if (mainNavSection) {
        const withinMain = within(mainNavSection);
        // Universal items MUST be present in main nav
        expect(withinMain.getByText('Tổng quan')).toBeInTheDocument();
        expect(withinMain.getByText('AI hỗ trợ')).toBeInTheDocument();
        expect(withinMain.getByText('Chủ đề')).toBeInTheDocument();
        expect(withinMain.getByText('Bản đồ tri thức')).toBeInTheDocument();
        expect(withinMain.getByText('Tiến độ')).toBeInTheDocument();
        expect(withinMain.getByText('Ghi chú')).toBeInTheDocument();
        expect(withinMain.getByText('Tài liệu')).toBeInTheDocument();
        expect(withinMain.getByText('Tìm kiếm')).toBeInTheDocument();

        // Domain-specific tools MUST NOT be in main nav section
        expect(withinMain.queryByText(/Ma trận phân tích/i)).toBeNull();
        expect(withinMain.queryByText(/Mô hình hệ thống/i)).toBeNull();
        expect(withinMain.queryByText(/Từ điển thuật ngữ/i)).toBeNull();
      }
    });
  });

  describe('2. Specialized / Advanced Tools Group (Công cụ chuyên sâu)', () => {
    it('2.1. Có nhóm "Công cụ chuyên sâu" riêng biệt chứa các module phân tích chuyên ngành', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Section title for specialized tools must exist
      expect(screen.getByText(/Công cụ chuyên sâu/i)).toBeInTheDocument();

      // The 3 specialized tools must be present in Sidebar
      expect(screen.getByText('Ma trận phân tích')).toBeInTheDocument();
      expect(screen.getByText('Mô hình hệ thống')).toBeInTheDocument();
      expect(screen.getByText('Từ điển thuật ngữ')).toBeInTheDocument();
    });

    it('2.2. Nhấp vào công cụ chuyên sâu sẽ kích hoạt chuyển đổi tab tương ứng', () => {
      function TestHost() {
        const { activeTab } = useData();
        return (
          <div>
            <div data-testid="current-tab">{activeTab}</div>
            <Sidebar />
          </div>
        );
      }

      render(
        <DataProvider>
          <TestHost />
        </DataProvider>
      );

      const matrixBtn = screen.getByText('Ma trận phân tích').closest('button');
      expect(matrixBtn).toBeDefined();
      if (matrixBtn) {
        fireEvent.click(matrixBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('abhidharma_matrix');
      }

      const systemBtn = screen.getByText('Mô hình hệ thống').closest('button');
      if (systemBtn) {
        fireEvent.click(systemBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('divination_matrix');
      }

      const lexiconBtn = screen.getByText('Từ điển thuật ngữ').closest('button');
      if (lexiconBtn) {
        fireEvent.click(lexiconBtn);
        expect(screen.getByTestId('current-tab').textContent).toBe('lexicon');
      }
    });

    it('2.3. Đánh dấu trạng thái Active chuẩn xác khi activeTab thuộc công cụ chuyên sâu', () => {
      render(
        <DataProvider>
          <SidebarWithActiveTab tab="abhidharma_matrix" />
        </DataProvider>
      );

      const matrixBtn = screen.getByText('Ma trận phân tích').closest('button');
      expect(matrixBtn?.className).toContain('bg-amber-100');
    });
  });

  describe('3. Backward Compatibility & Route Resilience in App.tsx', () => {
    it('3.1. App render không bị crash và hiển thị đúng module khi activeTab là công cụ chuyên sâu', () => {
      function AppWithTab({ tab }: { tab: ActiveTab }) {
        const { setActiveTab } = useData();
        React.useEffect(() => {
          setActiveTab(tab);
        }, [tab, setActiveTab]);
        return <App />;
      }

      const { unmount } = render(
        <DataProvider>
          <AppWithTab tab="abhidharma_matrix" />
        </DataProvider>
      );
      // AbhidharmaMatrix renders
      expect(screen.getByText(/Ma trận phân tích/i)).toBeInTheDocument();
      unmount();

      render(
        <DataProvider>
          <AppWithTab tab="divination_matrix" />
        </DataProvider>
      );
      // DivinationMatrix renders
      expect(screen.getByText(/Mô hình hệ thống/i)).toBeInTheDocument();
    });
  });
});
